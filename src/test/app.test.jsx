import React from 'react';
import * as redux from 'redux';
import { Provider } from 'react-redux';
import { act, render, fireEvent, within } from '@testing-library/react';

import thunk from 'redux-thunk';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import * as auth from '@edx/frontend-platform/auth';

import fakeData from 'data/services/lms/fakeData';
import api from 'data/services/lms/api';
import actions from 'data/actions';
import selectors from 'data/selectors';
import reducers from 'data/reducers';
import thunkActions from 'data/thunkActions';
import messages from 'i18n';

import App from 'App';

jest.mock('@edx/frontend-platform/auth', () => ({
  getAuthenticatedHttpClient: jest.fn(),
  getLoginRedirectUrl: jest.fn(),
}));

const configureStore = () => redux.createStore(
  reducers,
  redux.compose(redux.applyMiddleware(thunk)),
);

let el;
const spies = {};
let store;
let state;
let resolveFn;
let rejectFn;

const sleep = async (timeout) => new Promise((r) => setTimeout(r, timeout));

describe('ESG app integration tests', () => {
  describe('initialization', () => {
    let renderEl;
    beforeEach(() => {
      spies.initialize = jest.spyOn(thunkActions.app, 'initialize');
      store = configureStore();
      renderEl = () => render(
        <IntlProvider locale="en" messages={messages.en}>
          <Provider store={store}>
            <App />
          </Provider>
        </IntlProvider>,
      );
    });
    describe('initialization', () => {
      beforeEach(() => {
        api.initializeApp = jest.fn(() => new Promise(
          (resolve, reject) => {
            resolveFn = resolve;
            rejectFn = reject;
          },
        ));
        el = renderEl();
        state = store.getState();
      });

      test('initialState', () => {
        expect(state.app).toEqual(jest.requireActual('data/reducers/app').initialState);
        expect(state.submissions).toEqual(
          jest.requireActual('data/reducers/submissions').initialState,
        );
        expect(state.grading).toEqual(jest.requireActual('data/reducers/grading').initialState);
      });

      test('initialize call loads ora and course metadata and submissions list', async () => {
        resolveFn({
          oraMetadata: fakeData.oraMetadata,
          courseMetadata: fakeData.courseMetadata,
          submissions: fakeData.submissions,
        });
        await act(() => sleep(500));
        state = store.getState();
        expect(state.app.courseMetadata).toEqual(fakeData.courseMetadata);
        expect(state.app.oraMetadata).toEqual(fakeData.oraMetadata);
        expect(state.submissions.allSubmissions).toEqual(fakeData.submissions);
      });
    });
    describe('selection', () => {
      beforeEach(async () => {
        api.initializeApp = jest.fn(() => new Promise((resolve) => resolve({
          oraMetadata: fakeData.oraMetadata,
          courseMetadata: fakeData.courseMetadata,
          submissions: fakeData.submissions,
        })));
        el = renderEl();
        await act(() => sleep(500));
        state = store.getState();
      });
      test('table selection', async () => {
        const table = el.getByRole('table');
        const rows = table.querySelectorAll('tbody tr');
        const checkbox = (index) => within(rows.item(index)).getByTitle('Toggle Row Selected');
        const clickIndex = (index) => fireEvent.click(checkbox(index));
        [0, 1, 2, 3, 4].forEach(clickIndex);
        api.fetchSubmission = jest.fn((submissionId) => new Promise((resolve) => resolve(
          fakeData.mockSubmission(submissionId),
        )));
        fireEvent.click(el.container.querySelector('.view-selected-responses-btn'));
        state = store.getState();
        expect(state.grading.selected).toEqual([
          fakeData.ids.submissionId(0),
          fakeData.ids.submissionId(1),
          fakeData.ids.submissionId(2),
          fakeData.ids.submissionId(3),
          fakeData.ids.submissionId(4),
        ]);
      });
    });
  });
});
