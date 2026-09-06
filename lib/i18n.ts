export type Locale = "en" | "fr";

export const translations = {
  en: {
    nav: {
      home: "Home",
      directory: "Directory",
      admin: "Admin",
      myProfile: "My profile",
      completeProfile: "Complete profile",
      signIn: "Sign in",
      signOut: "Sign out",
      claimProfile: "Claim your profile",
    },

    common: {
      english: "English",
      french: "French",
      back: "Back",
      save: "Save",
      cancel: "Cancel",
      continue: "Continue",
      submit: "Submit",
      loading: "Loading…",
    },

    profile: {
      about: "About",
      careerField: "Career field",
      workHistory: "Work history",
      education: "Education",
      openTo: "Open to",
      contact: "Contact",
      contactAlumnus: "Contact alumnus",
      profileFreshness: "Profile freshness",
      noBiography: "No biography added yet.",
      notSpecified: "Not specified",
      noWorkHistory: "No work history added.",
      noEducation: "No education added.",
      noPreferences: "No preferences selected.",
      notConfirmed: "Not yet confirmed.",
      backToDirectory: "Back to directory",
      reachOut: "Reach out to this alumnus by email.",
      classOf: "Class of",
    },

    directory: {
      title: "Alumni Directory",
      search: "Search alumni",
      filters: "Filters",
    },

    claim: {
      title: "Claim your profile",
      requestVerification: "Request verification",
    },

    admin: {
      title: "Admin Dashboard",
      alumni: "Alumni",
      verificationRequests: "Verification requests",
      claimed: "Claimed",
      unclaimed: "Unclaimed",
      approve: "Approve",
      reject: "Reject",
      import: "Import alumni",
    },
  },

  fr: {
    nav: {
      home: "Accueil",
      directory: "Répertoire",
      admin: "Administration",
      myProfile: "Mon profil",
      completeProfile: "Compléter mon profil",
      signIn: "Se connecter",
      signOut: "Se déconnecter",
      claimProfile: "Réclamer mon profil",
    },

    common: {
      english: "Anglais",
      french: "Français",
      back: "Retour",
      save: "Enregistrer",
      cancel: "Annuler",
      continue: "Continuer",
      submit: "Soumettre",
      loading: "Chargement…",
    },

    profile: {
      about: "À propos",
      careerField: "Domaine professionnel",
      workHistory: "Expérience professionnelle",
      education: "Formation",
      openTo: "Disponible pour",
      contact: "Contact",
      contactAlumnus: "Contacter cet ancien",
      profileFreshness: "Mise à jour du profil",
      noBiography: "Aucune biographie ajoutée.",
      notSpecified: "Non précisé",
      noWorkHistory: "Aucune expérience professionnelle ajoutée.",
      noEducation: "Aucune formation ajoutée.",
      noPreferences: "Aucune préférence sélectionnée.",
      notConfirmed: "Pas encore confirmé.",
      backToDirectory: "Retour au répertoire",
      reachOut: "Communiquez avec cet ancien par courriel.",
      classOf: "Promotion",
    },

    directory: {
      title: "Répertoire des anciens",
      search: "Rechercher un ancien",
      filters: "Filtres",
    },

    claim: {
      title: "Réclamer mon profil",
      requestVerification: "Demander une vérification",
    },

    admin: {
      title: "Tableau de bord",
      alumni: "Anciens",
      verificationRequests: "Demandes de vérification",
      claimed: "Réclamés",
      unclaimed: "Non réclamés",
      approve: "Approuver",
      reject: "Refuser",
      import: "Importer des anciens",
    },
  },
} as const;

export function getTranslations(locale: Locale) {
  return translations[locale];
}
