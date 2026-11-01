import ts from "typescript";

export type Finding = {
  file: string;
  line: number;
  column: number;
  rule: string;
  text: string;
};

const textProps = new Set([
  "alt",
  "title",
  "placeholder",
  "aria-label",
  "aria-description",
  "aria-roledescription",
  "aria-valuetext",
  "label",
  "description",
  "heading",
  "message",
  "text",
  "children",
  "confirm",
  "helpText",
  "emptyMessage",
  "submitLabel",
]);

function unwrap(node: ts.Node): ts.Node {
  while (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node) ||
    ts.isNonNullExpression(node) ||
    ts.isTypeAssertionExpression(node)
  ) {
    node = node.expression;
  }
  return node;
}

function propertyName(node: ts.Node): string | undefined {
  return ts.isIdentifier(node) || ts.isStringLiteral(node) ? node.text : undefined;
}

function properties(node: ts.Node): Map<string, ts.PropertyAssignment> | undefined {
  node = unwrap(node);
  if (!ts.isObjectLiteralExpression(node)) return;
  const result = new Map<string, ts.PropertyAssignment>();
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const key = propertyName(property.name);
    if (key) result.set(key, property);
  }
  return result;
}

function localeCondition(
  node: ts.Node,
  checker?: ts.TypeChecker,
  seen = new Set<ts.Node>(),
): "en" | "fr" | undefined {
  node = unwrap(node);
  if (seen.has(node)) return;
  seen.add(node);
  if (ts.isIdentifier(node) && checker) {
    const declaration = checker.getSymbolAtLocation(node)?.valueDeclaration;
    if (declaration && ts.isVariableDeclaration(declaration) && declaration.initializer) {
      return localeCondition(declaration.initializer, checker, seen);
    }
  }
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.ExclamationToken) {
    const locale = localeCondition(node.operand, checker, seen);
    return locale === "en" ? "fr" : locale === "fr" ? "en" : undefined;
  }
  if (!ts.isBinaryExpression(node)) return;
  if (
    ![ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(
      node.operatorToken.kind,
    )
  )
    return;
  const isLocale = (value: ts.Node): boolean => {
    value = unwrap(value);
    if (ts.isAwaitExpression(value)) return isLocale(value.expression);
    if (ts.isCallExpression(value))
      return ts.isIdentifier(value.expression) && value.expression.text === "getServerLocale";
    return ts.isIdentifier(value)
      ? /^(locale|lang|language)$/.test(value.text)
      : ts.isPropertyAccessExpression(value) && /^(locale|lang|language)$/.test(value.name.text);
  };
  const isLanguage = (value: ts.Node) => ts.isStringLiteral(value) && /^(en|fr)$/.test(value.text);
  const value =
    isLocale(node.left) && isLanguage(node.right)
      ? node.right
      : isLanguage(node.left) && isLocale(node.right)
        ? node.left
        : undefined;
  if (!value || !ts.isStringLiteral(value)) return;
  const locale = value.text as "en" | "fr";
  return node.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken
    ? locale === "en"
      ? "fr"
      : "en"
    : locale;
}

function leaf(node: ts.Node): ts.Node {
  node = unwrap(node);
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    if (!ts.isBlock(node.body)) return unwrap(node.body);
    const returns = node.body.statements.filter(ts.isReturnStatement);
    if (returns.length === 1 && returns[0]?.expression) return unwrap(returns[0].expression);
  }
  return node;
}

/** Static checks only: never imports or executes application modules. */
export function analyze(source: ts.SourceFile, checker?: ts.TypeChecker): Finding[] {
  const findings: Finding[] = [];
  const reported = new Set<string>();
  const localized = new Set<ts.Node>();
  const report = (node: ts.Node, rule: string, text: string) => {
    const position = node.getStart(source);
    const id = `${position}:${rule}:${text}`;
    if (reported.has(id)) return;
    reported.add(id);
    const { line, character } = source.getLineAndCharacterOfPosition(position);
    findings.push({
      file: source.fileName.replaceAll("\\", "/"),
      line: line + 1,
      column: character + 1,
      rule,
      text: text.replace(/\s+/g, " ").trim(),
    });
  };

  function signature(node: ts.Node): string[] | undefined {
    node = leaf(node);
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const parts = (value: ts.Node): string[] => {
        value = unwrap(value);
        if (ts.isBinaryExpression(value) && value.operatorToken.kind === ts.SyntaxKind.PlusToken) {
          return [...parts(value.left), ...parts(value.right)];
        }
        return signature(value) ?? [`$${value.getText(source)}`];
      };
      return [...parts(node.left), ...parts(node.right)].sort();
    }
    if (ts.isStringLiteralLike(node)) {
      return [...node.text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]!).sort();
    }
    if (ts.isTemplateExpression(node)) {
      const parts = [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(
        "",
      );
      return [
        ...[...parts.matchAll(/\{(\w+)\}/g)].map((match) => match[1]!),
        ...node.templateSpans.map((span) => `$${span.expression.getText(source)}`),
      ].sort();
    }
  }

  function compare(left: ts.Node, right: ts.Node, path: string) {
    localized.add(left);
    localized.add(right);
    const en = properties(left),
      fr = properties(right);
    if (en && fr) {
      for (const value of [left, right]) {
        const object = unwrap(value);
        if (
          ts.isObjectLiteralExpression(object) &&
          object.properties.some((p) => !ts.isPropertyAssignment(p) || !propertyName(p.name))
        ) {
          report(object, "catalog-value", `${path}: dictionary properties must be explicit keys`);
        }
      }
      for (const key of new Set([...en.keys(), ...fr.keys()])) {
        const a = en.get(key),
          b = fr.get(key);
        if (!a || !b) {
          report(a ?? b!, "catalog-keys", `${path}.${key}: missing ${a ? "fr" : "en"}`);
        } else compare(a.initializer, b.initializer, `${path}.${key}`);
      }
      return;
    }
    if (en || fr) {
      report(right, "catalog-shape", `${path}: different English/French value types`);
      return;
    }
    for (const [locale, value] of [
      ["en", left],
      ["fr", right],
    ] as const) {
      const node = leaf(value);
      if (ts.isStringLiteralLike(node) && !node.text.trim()) {
        report(node, "catalog-empty", `${path}: empty ${locale} translation`);
      }
    }
    const a = signature(left),
      b = signature(right);
    if (!a || !b) {
      report(
        right,
        "catalog-value",
        `${path}: use a string, template, or string-returning function`,
      );
    } else if (JSON.stringify(a) !== JSON.stringify(b)) {
      report(
        right,
        "catalog-placeholders",
        `${path}: English/French placeholders differ (${a.join(", ")} / ${b.join(", ")})`,
      );
    }
  }

  function catalogs(node: ts.Node) {
    const props = properties(node);
    // An object-valued en OR fr also detects an accidentally deleted locale.
    const en = props?.get("en"),
      fr = props?.get("fr");
    if ((en && fr) || (en && properties(en.initializer)) || (fr && properties(fr.initializer))) {
      if (!en || !fr) report(node, "catalog-keys", `Missing ${en ? "fr" : "en"} dictionary`);
      else compare(en.initializer, fr.initializer, "translations");
    }
    const trueLocale = ts.isConditionalExpression(node) && localeCondition(node.condition, checker);
    if (ts.isConditionalExpression(node) && trueLocale) {
      const a = unwrap(node.whenTrue),
        b = unwrap(node.whenFalse);
      const frenchFirst = trueLocale === "fr";
      if ((properties(a) && properties(b)) || (signature(a) && signature(b))) {
        compare(frenchFirst ? b : a, frenchFirst ? a : b, "locale choice");
      }
    }
    ts.forEachChild(node, catalogs);
  }
  catalogs(source);

  function isLocalized(node: ts.Node): boolean {
    for (let parent: ts.Node | undefined = node; parent; parent = parent.parent) {
      if (localized.has(parent)) return true;
    }
    return false;
  }

  function text(node: ts.Node, seen = new Set<ts.Node>()) {
    node = unwrap(node);
    if (seen.has(node) || isLocalized(node)) return;
    seen.add(node);
    if (ts.isStringLiteralLike(node) || ts.isJsxText(node)) {
      // Punctuation and numbers are locale-neutral. Decode named JSX spacing entities.
      const value = node.text.replace(/&(?:nbsp|amp|lt|gt|quot|apos);/g, " ");
      if (/\p{L}/u.test(value)) report(node, "ui-literal", node.text);
    } else if (ts.isTemplateExpression(node)) {
      if (
        /\p{L}/u.test([node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join(""))
      ) {
        report(node, "ui-literal", node.getText(source));
      }
      for (const span of node.templateSpans) text(span.expression, seen);
    } else if (ts.isConditionalExpression(node)) {
      text(node.whenTrue, seen);
      text(node.whenFalse, seen);
    } else if (ts.isBinaryExpression(node)) {
      if (
        [
          ts.SyntaxKind.PlusToken,
          ts.SyntaxKind.QuestionQuestionToken,
          ts.SyntaxKind.BarBarToken,
        ].includes(node.operatorToken.kind)
      ) {
        text(node.left, seen);
        text(node.right, seen);
      } else if ([ts.SyntaxKind.AmpersandAmpersandToken].includes(node.operatorToken.kind)) {
        text(node.right, seen);
      }
    } else if (ts.isArrayLiteralExpression(node)) {
      for (const element of node.elements) text(element, seen);
    } else if (checker && (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node))) {
      let symbol = checker.getSymbolAtLocation(
        ts.isPropertyAccessExpression(node) ? node.name : node,
      );
      if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
      for (const declaration of symbol?.declarations ?? []) {
        // Cross-file values are checked in their own file only when they reach a supported sink.
        if (declaration.getSourceFile() !== source) continue;
        if (
          (ts.isVariableDeclaration(declaration) ||
            ts.isPropertyAssignment(declaration) ||
            ts.isParameter(declaration)) &&
          declaration.initializer
        )
          text(declaration.initializer, seen);
      }
    } else if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "format"
    ) {
      if (node.arguments[0]) text(node.arguments[0], seen);
    }
  }

  function visit(node: ts.Node) {
    if (ts.isJsxText(node)) text(node);
    if (
      ts.isJsxExpression(node) &&
      node.expression &&
      !ts.isJsxAttribute(node.parent) &&
      !ts.isJsxSpreadAttribute(node.parent)
    )
      text(node.expression);
    if (ts.isJsxAttribute(node) && node.initializer) {
      const name = node.name.getText(source);
      const tag = node.parent.parent.tagName.getText(source);
      const inputType = node.parent.properties.find(
        (p) => ts.isJsxAttribute(p) && p.name.getText(source) === "type",
      );
      const type =
        inputType &&
        ts.isJsxAttribute(inputType) &&
        inputType.initializer &&
        ts.isStringLiteral(inputType.initializer)
          ? inputType.initializer.text
          : "";
      if (
        textProps.has(name) ||
        (name === "value" && tag === "input" && ["submit", "reset", "button"].includes(type))
      ) {
        const value = node.initializer;
        if (ts.isJsxExpression(value)) {
          if (value.expression) text(value.expression);
        } else text(value);
      }
    }
    if (ts.isCallExpression(node)) {
      const name = ts.isIdentifier(node.expression)
        ? node.expression.text
        : ts.isPropertyAccessExpression(node.expression)
          ? node.expression.getText(source)
          : "";
      if (
        [
          "alert",
          "window.alert",
          "confirm",
          "window.confirm",
          "prompt",
          "window.prompt",
          "setError",
          "setMessage",
        ].includes(name)
      ) {
        if (node.arguments[0]) text(node.arguments[0]);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return findings.sort(
    (a, b) => a.line - b.line || a.column - b.column || a.rule.localeCompare(b.rule),
  );
}
