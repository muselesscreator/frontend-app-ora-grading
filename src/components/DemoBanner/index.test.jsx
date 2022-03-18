import React from 'react';
import { shallow } from 'enzyme';

import { DemoBanner } from '.';

describe('DemoBanner component', () => {
  let el;
  describe('snapshots', () => {
    const OLD_ENV = process.env;
    beforeAll(() => {
      jest.resetModules();
      process.env = { ...OLD_ENV };
    });
    afterAll(() => {
      process.env = OLD_ENV;
    });
    test('does not render if disabled flag is missing', () => {
      process.env.REACT_APP_NOT_ENABLED = false;
      el = shallow(<DemoBanner />);
      expect(el).toMatchSnapshot();
      expect(el.isEmptyRender()).toEqual(true);
    });
    test('snapshot: disabled flag is present', () => {
      process.env.REACT_APP_NOT_ENABLED = true;
      el = shallow(<DemoBanner />);
      expect(el).toMatchSnapshot();
      expect(el.isEmptyRender()).toEqual(false);
    });
  });
});
