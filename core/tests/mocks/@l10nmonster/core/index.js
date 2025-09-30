// test/mocks/@l10nmonster/core/index.js

export const L10nContext = {
  regression: false,
};

export const utils = {
    normalizedStringsAreEqual: (original, updated) => original === updated,
};

export class TranslationMemory {
  constructor() {
    this.entries = new Map();
  }

  setEntry(guid, entry) {
    this.entries.set(guid, entry);
  }

  async getEntries(guids) {
    const result = {};
    for (const guid of guids) {
      const entry = this.entries.get(guid);
      if (entry) {
        result[guid] = entry;
      }
    }
    return result;
  }
}

export class MonsterManager {
  constructor() {
    this.tmm = {
      getTM: () => this.translationMemory,
    };
    this.translationMemory = new TranslationMemory();
  }
};
