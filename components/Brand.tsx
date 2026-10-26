import Image from "next/image";
import Link from "next/link";

export function Brand() {
  return (
    // The visible text is the accessible name (axe label-content-name-mismatch); the logo is decorative.
    <Link className="brand" href="/">
      <Image
        src="/herzliah-logo.png"
        alt=""
        width={68}
        height={68}
        className="brandLogo brandIcon"
        priority
      />
      <div className="brandText">
        <div className="brandName">Herzliah Alumni Network</div>
        <div className="brandSub">Private · verified · connected</div>
      </div>
    </Link>
  );
}
