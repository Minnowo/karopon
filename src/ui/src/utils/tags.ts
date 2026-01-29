import {TblUserTag} from '../api/types';

/**
 * Checks whether a tag string contains a namespace separator (`:`)
 * with at least one character before it.
 *
 * Examples:
 * - `"foo:bar"` → true
 * - `":bar"` → false
 * - `"foo"` → false
 *
 * @param tagStr - The raw tag string to inspect
 * @returns True if a namespace is present, otherwise false
 */
export const HasNamespace = (tagStr: string): boolean => {
    return tagStr.indexOf(':') > 0;
};

/**
 * Checks whether a tag string contains both a namespace and a tag name.
 * A valid tag name must have characters on both sides of the `:` separator.
 *
 * Examples:
 * - `"foo:bar"` → true
 * - `"foo:"` → false
 * - `":bar"` → false
 *
 * @param tagStr - The raw tag string to inspect
 * @returns True if both namespace and tag name are present
 */
export const TagIsValid = (tagStr: string): boolean => {
    const index = tagStr.indexOf(':');
    return index > 0 && index < tagStr.length - 1;
};

/**
 * Converts a {@link TblUserTag} object into its string representation.
 *
 * Format: `namespace:name`
 *
 * @param tag - The tag object to stringify
 * @returns The string representation of the tag
 */
export const TagToString = (tag: TblUserTag): string => {
    return `${tag.namespace}:${tag.name}`;
};

/**
 * Splits a tag string into a {@link TblUserTag} object.
 *
 * If no namespace separator (`:`) is present, the entire string
 * is treated as the tag name and the namespace is set to an empty string.
 *
 * Examples:
 * - `"foo:bar"` → `{ namespace: "foo", name: "bar" }`
 * - `"bar"` → `{ namespace: "", name: "bar" }`
 *
 * @param tagStr - The raw tag string to split
 * @returns A {@link TblUserTag} object derived from the string
 */
export const SplitTag = (tagStr: string): TblUserTag => {
    const index = tagStr.indexOf(':');

    return {
        namespace: index === -1 ? '' : tagStr.substring(0, index).trim(),
        name: index === -1 ? tagStr.trim() : tagStr.substring(index + 1).trim(),
    } as TblUserTag;
};
