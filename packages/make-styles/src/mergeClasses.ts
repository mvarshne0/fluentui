import {
  DEFINITION_LOOKUP_TABLE,
  LOOKUP_DEFINITIONS_INDEX,
  LOOKUP_DIR_INDEX,
  SEQUENCE_HASH_LENGTH,
  SEQUENCE_PREFIX,
} from './constants';
import { hashSequence } from './runtime/utils/hashSequence';
import { reduceToClassName } from './runtime/reduceToClassNameForSlots';
import { CSSClassesMap } from './types';

// Contains a mapping of previously resolved sequences of atomic classnames
const mergeClassesCachedResults: Record<string, string> = {};

const SEQUENCE_SIZE = SEQUENCE_PREFIX.length + SEQUENCE_HASH_LENGTH;

/**
 * Function can take any number of arguments, joins classes together and deduplicates atomic declarations generated by
 * `makeStyles()`. Handles scoped directional styles.
 *
 * Classnames can be of any length, this function can take both atomic declarations and class names.
 *
 * Input:
 * ```
 * // not real classes
 * mergeClasses('ui-button', 'displayflex', 'displaygrid')
 * ```
 *
 * Output:
 * ```
 * 'ui-button displaygrid'
 * ```
 */
export function mergeClasses(...classNames: (string | false | undefined)[]): string;

export function mergeClasses(): string {
  // arguments are parsed manually to avoid double loops as TS & Babel transforms rest via an additional loop
  // @see https://babeljs.io/docs/en/babel-plugin-transform-parameters

  let dir: 'ltr' | 'rtl' | null = null;
  let resultClassName = '';
  // Is used as a cache key to avoid object merging
  let sequenceMatch = '';

  const sequenceMappings: CSSClassesMap[] = [];

  for (let i = 0; i < arguments.length; i++) {
    // eslint-disable-next-line prefer-rest-params
    const className = arguments[i];

    if (typeof className === 'string') {
      // All classes generated by `makeStyles()` are prefixed by a sequence hash, this allows to identify class sets
      // without parsing each className in a string
      const sequenceIndex = className.indexOf(SEQUENCE_PREFIX);

      if (sequenceIndex === -1) {
        resultClassName += className + ' ';
      } else {
        const sequenceId = className.slice(sequenceIndex, sequenceIndex + SEQUENCE_SIZE);
        const sequenceMapping = DEFINITION_LOOKUP_TABLE[sequenceId];

        // Handles a case with mixed classnames, i.e. "ui-button ATOMIC_CLASSES"
        if (sequenceIndex > 0) {
          resultClassName += className.slice(0, sequenceIndex);
        }

        if (sequenceMapping) {
          sequenceMatch += sequenceId;
          sequenceMappings.push(sequenceMapping[LOOKUP_DEFINITIONS_INDEX]);

          if (process.env.NODE_ENV !== 'production') {
            if (dir !== null && dir !== sequenceMapping[LOOKUP_DIR_INDEX]) {
              // eslint-disable-next-line no-console
              console.error(
                `mergeClasses(): a passed string contains an identifier (${sequenceId}) that has different direction ` +
                  `(dir="${sequenceMapping[1] ? 'rtl' : 'ltr'}") setting than other classes. This is not supported. ` +
                  `Source string: ${className}`,
              );
            }
          }

          dir = sequenceMapping[LOOKUP_DIR_INDEX];
        } else {
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.error(
              `mergeClasses(): a passed string contains an identifier (${sequenceId}) that does not match any entry ` +
                `in cache. Source string: ${className}`,
            );
          }
        }
      }

      if (process.env.NODE_ENV !== 'production') {
        if (className.indexOf(SEQUENCE_PREFIX, sequenceIndex + 1) !== -1) {
          // eslint-disable-next-line no-console
          console.error(
            'mergeClasses(): a passed string contains multiple identifiers of atomic classes (classes that start ' +
              `with "${SEQUENCE_PREFIX}"), it's possible that passed classes were concatenated in a wrong way. ` +
              `Source string: ${className}`,
          );
        }
      }
    }
  }

  // .slice() there allows to avoid trailing space for non-atomic classes
  // "ui-button ui-flex " => "ui-button ui-flex"
  if (sequenceMatch === '') {
    return resultClassName.slice(0, -1);
  }

  // It's safe to reuse results to avoid continuous merging as results are stable
  // "__seq1 ... __seq2 ..." => "__seq12 ..."
  const mergeClassesResult = mergeClassesCachedResults[sequenceMatch];

  if (mergeClassesResult !== undefined) {
    return resultClassName + mergeClassesResult;
  }

  // eslint-disable-next-line prefer-spread
  const resultDefinitions = Object.assign.apply<Object, CSSClassesMap[], CSSClassesMap>(
    Object,
    // .assign() mutates the first object, we can't mutate mappings as it will produce invalid results later
    [{}].concat(sequenceMappings),
  );

  let atomicClassNames = reduceToClassName(resultDefinitions, dir!);

  // Each merge of classes generates a new sequence of atomic classes that needs to be registered
  const newSequenceHash = hashSequence(atomicClassNames, dir!);
  atomicClassNames = newSequenceHash + ' ' + atomicClassNames;

  mergeClassesCachedResults[sequenceMatch] = atomicClassNames;
  DEFINITION_LOOKUP_TABLE[newSequenceHash] = [resultDefinitions, dir!];

  return resultClassName + atomicClassNames;
}
