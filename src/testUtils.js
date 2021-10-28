/* eslint-disable import/prefer-default-export */
/**
 * mock components
 * @example mockStructuredComponents('Card', { Card: ['Body']})
 * @param {string[]} components
 * @param {map{string, string[]}} nestedComponents
 */
const mockStructuredComponents = (components = [], nestedComponents = {}) => {
  const mockResults = {};
  components.forEach(
    (component) => {
      const fn = () => component;
      // this is necessary to define arrow function a name.
      // Mock is using the function name to define the method.
      Object.defineProperty(fn, 'name', { value: component });
      mockResults[component] = fn;
    },
  );

  Object.keys(nestedComponents).forEach(component => {
    mockResults[component] = mockResults[component] || {};
    nestedComponents[component].forEach(
      (nestedComponent) => {
        mockResults[component][nestedComponent] = `${component}.${nestedComponent}`;
      },
    );
  });

  return mockResults;
};

/**
 * This method is helper for writing mock for paragon components.
 * Note: This assume paragon has only 2 level coomponent at most.
 * @example mockComponents('Card', 'Card.Body')
 * @param  {...string} args
 */
export const mockComponents = (...args) => {
  const components = [];
  const nestedComponents = {};

  args.forEach((component) => {
    if (component.includes('.')) {
      const [name, value] = component.split('.');
      nestedComponents[name] = nestedComponents[name] || [];
      nestedComponents[name].push(value);
    } else {
      components.push(component);
    }
  });

  return mockStructuredComponents(components, nestedComponents);
};

/**
 * mapping = {
 *   Button: 'Button',
 *   DataTable: {
 *     Body: 'DataTable.Body',
 *   }
 * }
 */
export const mockComponents2 = (mapping) => {
  const mockedModule = {};
  Object.keys(mapping).forEach(name => {
    const isNested = typeof mapping[name] === 'object';
    const value = isNested ? name : mapping[name];
    mockedModule[name] = () => value;
    Object.defineProperty(mockedModule[name], 'name', { value });
    if (isNested) {
      Object.keys(mapping[name]).forEach(subComponentName => {
        mockedModule[name][subComponentName] = mapping[name][subComponentName];
      });
    }
  });
  return mockedModule;
};

/**
 * mockNestedComponent('Card', { Body: 'Card.Body', ... });
 */
export const mockNestedComponent = (name, nestedComponents) => {
  const fn = () => name;
  Object.defineProperty(fn, 'name', { value: name });
  Object.keys(nestedComponents).forEach(nestedName => {
    fn[nestedName] = nestedComponents[nestedName];
  });
  return fn;
};
