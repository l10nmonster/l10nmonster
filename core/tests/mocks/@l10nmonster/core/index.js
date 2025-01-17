// test/mocks/@l10nmonster/core/index.js

export const L10nContext = {
  regression: false,
};

export const utils = {
  normalizedStringsAreEqual: (original, updated) => {
    // Simple mock implementation
    return original === updated;
  },
};

export class TranslationMemory {
  constructor() {
    this.entries = new Map();
  }

  getEntryByGuid(guid) {
    return this.entries.get(guid);
  }

  setEntry(guid, entry) {
    this.entries.set(guid, entry);
  }
}

export class MonsterManager {
  constructor() {
    this.tmm = {
      getTM: async (sourceLang, baseLang) => {
        return this.translationMemory;
      },
    };
    this.translationMemory = new TranslationMemory();
  }
};
