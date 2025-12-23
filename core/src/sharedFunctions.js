/**
 * Groups an array of objects into a nested object structure based on specified
 * property names.
 *
 * @param {Array<object>} data The input array of objects.
 * @param {Array<string>} groupByProps An array of property names (strings) to group by,
 *                                     defining the nesting order.
 * @param {boolean} [keepGroupProps=false] If true, the objects in the final arrays
 *                                         will retain the grouping properties.
 *                                         If false (default), the grouping properties
 *                                         will be omitted from the objects in the final arrays.
 * @returns {object} A nested object where keys at each level correspond to
 *                   the values of the specified properties. The value at the deepest
 *                   level is an array containing the processed objects
 *                   (either original or with grouping props removed)
 *                   belonging to that specific group.
 * @throws {Error} If data or groupByProps are not arrays.
 */
export function groupObjectsByNestedProps(data, groupByProps, keepGroupProps = false) {
    // --- Input Validation ---
    if (!Array.isArray(data)) {
      throw new Error("Input 'data' must be an array.");
    }
    if (!Array.isArray(groupByProps)) {
      throw new Error("'groupByProps' must be an array.");
    }
    if (groupByProps.some(prop => typeof prop !== 'string')) {
        throw new Error("'groupByProps' must only contain strings.");
    }
  
    // --- Edge Case: No Grouping ---
    // If no properties to group by, return a single group (e.g., under key '_all')
    // containing all original objects (or processed ones if keepGroupProps affects this).
    if (groupByProps.length === 0) {
      if (keepGroupProps) {
          // If keeping props, just return a shallow copy of original objects
          return { _all: data.map(item => ({ ...item })) };
      } else {
          // If removing props (even though none are specified for grouping),
          // we technically still return copies of the originals in this edge case.
          return { _all: data.map(item => ({ ...item })) };
      }
    }
  
    // --- Main Grouping Logic ---
    return data.reduce((acc, item) => {
      // Ensure item is an object, skip otherwise
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        console.warn("Skipping non-object element in data:", item);
        return acc;
      }
  
      let currentNode = acc; // Start at the top level of the accumulator
  
      // Traverse/create the nested structure based on groupByProps
      for (let i = 0; i < groupByProps.length - 1; i++) {
        const propName = groupByProps[i];
        const key = Object.hasOwn(item, propName) ? item[propName] : undefined; // Handle missing properties
  
        // If the key node doesn't exist, or isn't an object, create/overwrite it
        // We use String(key) because object keys are implicitly strings (or Symbols)
        // This handles `null`, `undefined`, numbers correctly as keys.
        const keyString = String(key);
        if (!currentNode[keyString] || typeof currentNode[keyString] !== 'object' || Array.isArray(currentNode[keyString])) {
          currentNode[keyString] = {};
        }
        // Move down to the next level
        currentNode = currentNode[keyString];
      }
  
      // Handle the final level (where the array of items/processed items goes)
      const finalPropName = groupByProps[groupByProps.length - 1];
      const finalKey = Object.hasOwn(item, finalPropName) ? item[finalPropName] : undefined;
      const finalKeyString = String(finalKey);
  
      // Initialize the array if it doesn't exist at the final key position
      if (!currentNode[finalKeyString]) {
        currentNode[finalKeyString] = [];
      }
      // Optional safety check: Ensure it *is* an array before pushing
      // if (!Array.isArray(currentNode[finalKeyString])) { currentNode[finalKeyString] = []; }
  
      // Determine what object to push into the final array
      let objectToPush;
      if (keepGroupProps) {
        objectToPush = { ...item }; // Push a shallow copy of the original item
      } else {
        // Create a new object excluding the grouping properties
        objectToPush = { ...item };
        for (const propToRemove of groupByProps) {
          delete objectToPush[propToRemove];
        }
      }
  
      // Push the processed object onto the array at the final nested level
      currentNode[finalKeyString].push(objectToPush);
  
      return acc; // Return the accumulator for the next iteration
    }, {}); // Initial value is an empty object
}
