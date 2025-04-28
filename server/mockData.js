// server/data/mockData.js

// Use 'export const' for each piece of data

export const languagePairs = [
  { source: 'en-us', target: 'fr-fr', sourceName: 'English (US)', targetName: 'French (FR)', sourceFlag: '🇺🇸', targetFlag: '🇫🇷' },
  { source: 'en-us', target: 'de-de', sourceName: 'English (US)', targetName: 'German (DE)', sourceFlag: '🇺🇸', targetFlag: '🇩🇪' },
  { source: 'es-es', target: 'en-gb', sourceName: 'Spanish (ES)', targetName: 'English (UK)', sourceFlag: '🇪🇸', targetFlag: '🇬🇧' },
];

export const projectsData = {
  'en-us_fr-fr': {
    'Website': [
      { id: 'proj1', name: 'Q3 Homepage Update', status: 'In Progress', progress: 80, totalWords: 1500, translatedWords: 1200, untranslatedWords: 300, dueDate: '2023-12-15' },
      { id: 'proj2', name: 'Blog Feature Launch', status: 'Needs Translation', progress: 0, totalWords: 500, translatedWords: 0, untranslatedWords: 500, dueDate: '2023-12-20' },
    ],
    'Mobile App (iOS)': [
      { id: 'proj3', name: 'v2.5 String Updates', status: 'Completed', progress: 100, totalWords: 850, translatedWords: 850, untranslatedWords: 0, dueDate: '2023-11-30' },
    ]
  },
  'en-us_de-de': {
     'Website': [
       { id: 'proj4', name: 'Q3 Homepage Update', status: 'Needs Review', progress: 100, totalWords: 1500, translatedWords: 1500, untranslatedWords: 0, dueDate: '2023-12-15' },
     ],
     'Marketing Docs': [
       { id: 'proj5', name: 'Winter Sale Brochure', status: 'Needs Translation', progress: 0, totalWords: 2000, translatedWords: 0, untranslatedWords: 2000, dueDate: '2023-12-10' },
     ]
  },
   'es-es_en-gb': {
     'General': [
       { id: 'proj6', name: 'Support Articles Q4', status: 'In Progress', progress: 50, totalWords: 5000, translatedWords: 2500, untranslatedWords: 2500, dueDate: '2024-01-10' },
     ]
   }
};

export const untranslatedContent = {
  'en-us_fr-fr': [
    { id: 'str1', sourceText: 'Welcome to our new feature!', contextKey: 'homepage.welcome_banner', channel: 'Website', project: 'Q3 Homepage Update', dateAdded: '2023-11-15' },
    { id: 'str2', sourceText: 'Click here to learn more.', contextKey: 'button.learn_more', channel: 'Website', project: 'Q3 Homepage Update', dateAdded: '2023-11-15' },
    { id: 'str3', sourceText: 'Update your profile settings.', contextKey: 'profile.update_prompt', channel: 'Mobile App (iOS)', project: 'v2.5 String Updates', dateAdded: '2023-11-10' },
    { id: 'str4', sourceText: 'Are you sure you want to delete?', contextKey: 'dialog.delete_confirm', channel: 'Mobile App (iOS)', project: 'v2.5 String Updates', dateAdded: '2023-11-10' },
    { id: 'str5', sourceText: 'Read our latest blog post on AI trends.', contextKey: 'blog.latest_post_title', channel: 'Website', project: 'Blog Feature Launch', dateAdded: '2023-11-18' },
  ],
  'en-us_de-de': [
    { id: 'str6', sourceText: 'Discover our winter collection.', contextKey: 'marketing.winter_headline', channel: 'Marketing Docs', project: 'Winter Sale Brochure', dateAdded: '2023-11-20' },
    { id: 'str7', sourceText: 'Save up to 30%!', contextKey: 'marketing.winter_discount', channel: 'Marketing Docs', project: 'Winter Sale Brochure', dateAdded: '2023-11-20' },
  ],
};

export const tmData = {
  'en-us_fr-fr': {
    summary: { totalUnits: 15830, lastUpdated: '2023-11-20' },
    units: [
      { id: 'tm1', sourceText: 'Save Changes', targetText: 'Enregistrer les modifications', contextKey: 'button.save', project: 'Q2 Settings Update', dateModified: '2023-06-10' },
      { id: 'tm2', sourceText: 'Cancel', targetText: 'Annuler', contextKey: 'button.cancel', project: 'Q2 Settings Update', dateModified: '2023-06-10' },
      { id: 'tm3', sourceText: 'Welcome back, {user}!', targetText: 'Bon retour, {user} !', contextKey: 'header.greeting', project: 'Initial Launch', dateModified: '2023-01-15' },
      { id: 'tm4', sourceText: 'View Details', targetText: 'Voir les détails', contextKey: 'link.view_details', project: 'Product Page v1', dateModified: '2023-03-22' },
    ]
  },
  'en-us_de-de': {
     summary: { totalUnits: 12105, lastUpdated: '2023-11-18' },
     units: [
       { id: 'tm5', sourceText: 'Save Changes', targetText: 'Änderungen speichern', contextKey: 'button.save', project: 'Q2 Settings Update', dateModified: '2023-06-10' },
       { id: 'tm6', sourceText: 'Cancel', targetText: 'Abbrechen', contextKey: 'button.cancel', project: 'Q2 Settings Update', dateModified: '2023-06-10' },
     ]
  },
};