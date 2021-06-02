import { parseScript } from '../../src/grater';
import { readdirSync, readFileSync } from 'fs';
import * as t from 'assert';

const Test262Dir = 'node_modules/test262-parser-tests';

const expectations = {
  pass: ['a62c6323a3696fa8.js', '110fa1efdd0868b8.js', '946bee37652a31fa.js', 'ba00173ff473e7da.js'],
  explicit: ['110fa1efdd0868b8.js'],
  fail: [
    '3dbb6e166b14a6c0.js',
    'fb130c395c6aafe7.js',
    '15a6123f6b825c38.js',
    '147fa078a7436e0e.js',
    '1acada3c651821cf.js',

    '3bc2b27a7430f818.js',
    'e4a43066905a597b.js',
    'bf49ec8d96884562.js',
    '8af69d8f15295ed2.js',
    '78c215fabdf13bae.js',
    '66e383bfd18e66ab.js',
    '647e21f8f157c338.js',
    '7b876ca5139f1ca8.js',
    'e3fbcf63d7e43ead.js',
    'fd2a45941e114896.js',
    '0ff3826356c94f67.js',
    '211656c4eaff2d9c.js',
    '4cce9feb5a563377.js',
    '7b70beed5a327548.js',
    '7fc173197c3cc75d.js',
    '82b8003b91d8b346.js',
    '8373e2a6865dc08c.js',
    '84633c379e4010bf.js',
    '8e93bcbd389c6bf6.js',
    '95c10472e36270b6.js',
    'bcde05eea9466dfd.js',
    'cbc28b1205acaac8.js',
    'cee6d8878d1e6589.js',
    'e5fabf7fc4ae5dea.js',
    'f01b16bb3e6cd7a3.js',
    'f0aeffcc826c3d6b.js'
  ],
  early: [
    'ec31fa5e521c5df4.js',
    'e262ea7682c36f92.js',
    'be7329119eaa3d47.js',
    '4de83a7417cd30dd.js',
    '1aff49273f3e3a98.js',
    '12a74c60f52a60de.js',
    '0f5f47108da5c34e.js',
    '2fcc5b7e8d0ff3c9.js',
    '4435f19f2a2a24bd.js'
  ]
};

// const parse = (src: string, module: boolean) => (module ? parseModule : parseScript)(src);

const isModule = (val: string) => /\.module\.js/.test(val);

describe('Test262 Parser tests', () => {
  describe('Pass', () => {
    for (const f of readdirSync(`${Test262Dir}/pass`)) {
      if (expectations.pass.indexOf(f) !== -1) continue;

      // Skip
      if(isModule(f)) continue;

      it(`Should pass -  [${f}]`, () => {
        t.doesNotThrow(() => {
          parseScript(readFileSync(`${Test262Dir}/pass/${f}`, 'utf8'));
        });
      });
    }
  });
  describe('Fail', () => {
    for (const f of readdirSync(`${Test262Dir}/fail`)) {
      if (expectations.fail.indexOf(f) !== -1) continue;
      // Skip
      if(isModule(f)) continue;


      it(`Should fail on - [${f}]`, () => {
        t.throws(() => {
          parseScript(readFileSync(`${Test262Dir}/fail/${f}`, 'utf8'));
        });
      });
    }
  });
  /*
  describe('Early errors', () => {
    for (const f of readdirSync(`${Test262Dir}/early`)) {
      if (expectations.early.indexOf(f) !== -1) continue;
      it(`should fail on early error [${f}]`, () => {
        t.throws(() => {
          parse(readFileSync(`${Test262Dir}/early/${f}`, 'utf8'), isModule(f));
        });
      });
    }
  });*/

  describe('Pass explicit', () => {
    for (const f of readdirSync(`${Test262Dir}/pass-explicit`)) {
      if (expectations.explicit.indexOf(f) !== -1) continue;
      // Skip
      if(isModule(f)) continue;

      it(`Should pass -  [${f}]`, () => {
        t.doesNotThrow(() => {
          parseScript(readFileSync(`${Test262Dir}/pass-explicit/${f}`, 'utf8'));
        });
      });
    }
  });
});
