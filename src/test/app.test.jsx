/* eslint-disable */
import React from 'react';
import * as redux from 'redux';
import { Provider } from 'react-redux';
import {
  act,
  render,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import thunk from 'redux-thunk';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import urls from 'data/services/lms/urls';
import { ErrorStatuses, RequestKeys, RequestStates } from 'data/constants/requests';
import { gradeStatuses, lockStatuses } from 'data/services/lms/constants';
import fakeData from 'data/services/lms/fakeData';
import api from 'data/services/lms/api';
import reducers from 'data/redux';
import messages from 'i18n';
import { selectors } from 'data/redux';

import App from 'App';
import appMessages from './messages';

jest.unmock('@edx/paragon');
jest.unmock('@edx/paragon/icons');
jest.unmock('@edx/frontend-platform/i18n');

jest.mock('@edx/frontend-platform/auth', () => ({
  getAuthenticatedHttpClient: jest.fn(),
  getLoginRedirectUrl: jest.fn(),
}));

jest.mock('react-pdf', () => ({
  Document: () => <div>Document</div>,
  Image: () => <div>Image</div>,
  Page: () => <div>Page</div>,
  PDFViewer: jest.fn(() => null),
  StyleSheet: { create: () => {} },
  Text: () => <div>Text</div>,
  View: () => <div>View</div>,
  pdfjs: { GlobalWorkerOptions: {} },
}));
/*
jest.mock('react-pdf/node_modules/pdfjs-dist/build/pdf.worker.entry', () => (
  jest.requireActual('react-pdf/dist/umd/entry.jest')
));
*/
const configureStore = () => redux.createStore(
  reducers,
  redux.compose(redux.applyMiddleware(thunk)),
);

let el;
let store;
let state;
let retryLink;
let find;
let get;

const { rubricConfig } = fakeData.oraMetadata;

/**
 * Simple wrapper for updating the top-level state variable, that also returns the new value
 * @return {obj} - current redux store state
 */
const getState = () => {
  state = store.getState();
  return state;
};

/** Fake Data for quick access */
const submissionUUIDs = [
  fakeData.ids.submissionUUID(0),
  fakeData.ids.submissionUUID(1),
  fakeData.ids.submissionUUID(2),
  fakeData.ids.submissionUUID(3),
  fakeData.ids.submissionUUID(4),
];
const submissions = submissionUUIDs.map(id => fakeData.mockSubmission(id));

const resolveFns = {};
/**
 * Mock the api with jest functions that can be tested against.
 */
const mockNetworkError = (reject) => () => reject(new Error({
  response: { status: ErrorStatuses.badRequest },
}));
const mockApi = () => {
  api.initializeApp = jest.fn(() => new Promise(
    (resolve, reject) => {
      resolveFns.init = {
        success: () => resolve({
          oraMetadata: fakeData.oraMetadata,
          courseMetadata: fakeData.courseMetadata,
          submissions: fakeData.submissions,
        }),
        networkError: mockNetworkError(reject),
      };
    },
  ));
  api.fetchSubmission = jest.fn((submissionUUID) => new Promise(
    (resolve, reject) => {
      resolveFns.fetch = {
        success: () => resolve(fakeData.mockSubmission(submissionUUID)),
        networkError: mockNetworkError(reject),
      };
    },
  ));
  api.fetchSubmissionStatus = jest.fn((submissionUUID) => new Promise(
    (resolve) => resolve(fakeData.mockSubmissionStatus(submissionUUID)),
  ));
  api.fetchSubmissionResponse = jest.fn((submissionUUID) => new Promise(
    (resolve) => resolve({ response: fakeData.mockSubmission(submissionUUID).response }),
  ));
  api.lockSubmission = jest.fn(() => new Promise(
    (resolve, reject) => {
      resolveFns.lock = {
        success: () => resolve({ lockStatus: lockStatuses.inProgress }),
        networkError: mockNetworkError(reject),
      };
    },
  ));
  api.unlockSubmission = jest.fn(() => new Promise(
    (resolve, reject) => {
      resolveFns.unlock = {
        success: () => resolve({ lockStatus: lockStatuses.unlocked }),
        networkError: mockNetworkError(reject),
      };
    },
  ));
  api.updateGrade = jest.fn((uuid, gradeData) => new Promise(
    (resolve, reject) => {
      resolveFns.updateGrade = {
        success: () => resolve({
          gradeData,
          gradeStatus: gradeStatuses.graded,
          lockStatus: lockStatuses.unlocked,
        }),
        networkError: mockNetworkError(reject),
      };
    },
  ));
};

/**
 * load and configure the store, render the element, and populate the top-level state object
 */
const renderEl = async () => {
  store = configureStore();
  el = await render(
    <IntlProvider locale='en' messages={messages.en}>
      <Provider store={store}>
        <App />
      </Provider>
    </IntlProvider>,
  );
  getState();
};

// collection of element-returning methods for grabbing UI elements
class Inspector {
  listTable = () => el.getByRole('table');
  modal = () => el.getByRole('dialog');
  modalEl = () => within(this.modal());

  listTable = () => el.getByRole('table');
  listTableRows = () => this.listTable().querySelectorAll('tbody tr');
  listCheckbox = (index) => (
    within(this.listTableRows().item(index))
      .getByTitle('Toggle Row Selected')
  );
  listViewSelectedBtn = () => el.getByText('View selected responses (5)');
  nextNav = () => el.getByLabelText(appMessages.ReviewActionsComponents.loadNext);
  prevNav = () => el.getByLabelText(appMessages.ReviewActionsComponents.loadPrevious);
  reviewUsername = (index) => this.modalEl().getByText(fakeData.ids.username(index));
  reviewLoadingResponse = () => this.modalEl().getByText(appMessages.ReviewModal.loadingResponse);
  reviewRetryLink = () => (
    el.getByText(appMessages.ReviewErrors.reloadSubmission).closest('button')
  );
  reviewGradingStatus = (submission) => (
    this.modalEl().getByText(appMessages.lms[gradingStatus(submission)])
  );

  rubricCriteria = () => this.modal().querySelectorAll('.rubric-criteria');
  criterionFeedback = () => this.modal().querySelectorAll('.criterion-feedback');
  rubricFeedback = () => this.modal().querySelector('.rubric-feedback');

  rubric = () => get.modalEl().getByText(appMessages.Rubric.rubric).closest('div');
  rubricCriterion = (index) => (
    within(this.rubric())
      .getByText(rubricConfig.criteria[index].prompt).closest('div')
  );
  rubricOption = (criterionIndex, optionIndex) => (
    within(this.rubricCriterion(criterionIndex))
      .getByText(rubricConfig.criteria[criterionIndex].options[optionIndex].label)
  );
  rubricCriterionFeedback = (index) => within(this.rubricCriterion(index)).getByRole('textbox');
  rubricFeedback = () => (
    within(this.rubric()).getByText(appMessages.Rubric.overallComments).closest('div')
  );
  rubricFeedbackInput = () => within(this.rubricFeedback()).getByRole('textbox');
  submitGradeBtn = () => this.modalEl().getByText(appMessages.Rubric.submitGrade);
}

// collection of Promise-returning methods for grabbing UI elements 
class Finder {
  listViewAllResponsesBtn = () => el.findByText(appMessages.ListView.viewAllResponses);
  listLoadErrorHeading = () => el.findByText(appMessages.ListView.loadErrorHeading);
  prevNav = () => get.modalEl().findByLabelText(appMessages.ReviewActionsComponents.loadPrevious);
  reviewLoadErrorHeading = () => el.findByText(appMessages.ReviewErrors.loadErrorHeading);
  startGradingBtn = () => el.findByText(appMessages.ReviewActionsComponents.startGrading);
  submitGradeBtn = () => el.findByText(appMessages.Rubric.submitGrade);
}

/**
 * resolve the initalization promise, and update state object
 */
const initialize = async () => {
  resolveFns.init.success();
  await find.listViewAllResponsesBtn();
  getState();
};

/**
 * Select the first 5 entries in the table and click the 'View Selected Responses' button
 * Wait for the review page to show and update the top-level state object.
 */
const makeTableSelections = async () => {
  [0, 1, 2, 3, 4].forEach(index => userEvent.click(get.listCheckbox(index)));
  userEvent.click(get.listViewSelectedBtn());
  // wait for navigation, which will show while request is pending
  try {
    await find.prevNav();
  } catch (e) {
    throw(e);
  }
  getState();
};

// Click the 'next' button in review modal
const clickNext = async () => { userEvent.click(get.nextNav()); };

// Click the 'next' button in review modal
const clickPrev = async () => { userEvent.click(get.prevNav()); };

const waitForEqual = async (valFn, expected, key) => waitFor(() => {
  expect(valFn(), `${key} is expected to equal ${expected}`).toEqual(expected);
});
const waitForRequestStatus = (key, status) => waitForEqual(
  () => getState().requests[key].status,
  status,
  key,
);

const gradingStatus = ({ lockStatus, gradeStatus }) => (
  lockStatus === lockStatuses.unlocked ? gradeStatus : lockStatus
);

describe('ESG app integration tests', () => {
  beforeEach(async () => {
    mockApi();
    await renderEl();
    get = new Inspector();
    find = new Finder();
  });

  test('initialization', async (done) => {
    const verifyInitialState = async () => {
      await waitForRequestStatus(RequestKeys.initialize, RequestStates.pending);
      const testInitialState = (key) => expect(
        state[key],
        `${key} store should have its configured initial state`,
      ).toEqual(
        jest.requireActual(`data/redux/${key}/reducer`).initialState,
      );
      testInitialState('app');
      testInitialState('submissions');
      testInitialState('grading');
      expect(
        el.getByText(appMessages.ListView.loadingResponses),
        'Loading Responses pending state text should be displayed in the ListView',
      ).toBeVisible();
    }
    await verifyInitialState();

    // initialization network error
    const forceAndVerifyInitNetworkError = async () => {
      resolveFns.init.networkError();
      await waitForRequestStatus(RequestKeys.initialize, RequestStates.failed);
      expect(
        await find.listLoadErrorHeading(),
        'List Error should be available (by heading component)',
      ).toBeVisible();
      const backLink = el.getByText(appMessages.ListView.backToResponsesLowercase).closest('a');
      expect(
        backLink.href,
        'Back to responses button href should link to urls.openResponse(courseId)',
      ).toEqual(urls.openResponse(getState().app.courseMetadata.courseId));
    };
    await forceAndVerifyInitNetworkError();

    // initialization retry/pending
    retryLink = el.getByText(appMessages.ListView.reloadSubmissions).closest('button');
    await userEvent.click(retryLink);
    await waitForRequestStatus(RequestKeys.initialize, RequestStates.pending);

    // initialization success
    const forceAndVerifyInitSuccess = async () => {
      await initialize();
      await waitForRequestStatus(RequestKeys.initialize, RequestStates.completed);
      expect(
        state.app.courseMetadata,
        'Course metadata in redux should be populated with fake data',
      ).toEqual(fakeData.courseMetadata);
      expect(
        state.app.oraMetadata,
        'ORA metadata in redux should be populated with fake data',
      ).toEqual(fakeData.oraMetadata);
      expect(
        state.submissions.allSubmissions,
        'submissions data in redux should be populated with fake data',
      ).toEqual(fakeData.submissions);
    };
    await forceAndVerifyInitSuccess();

    await makeTableSelections();
    await waitForRequestStatus(RequestKeys.fetchSubmission, RequestStates.pending);
    done();
  });

  describe('initialized', () => {
    beforeEach(async () => {
      await initialize();
      await waitForRequestStatus(RequestKeys.initialize, RequestStates.completed);
      await makeTableSelections();
      await waitForRequestStatus(RequestKeys.fetchSubmission, RequestStates.pending);
    });

    test('initial review state', async (done) => {
      // Make table selection and load Review pane
      expect(
        state.grading.selected,
        'submission IDs should be loaded',
      ).toEqual(submissionUUIDs);
      // expect(get.modal(), 'ReviewModal should be visible').toBeVisible();
      expect(state.app.showReview, 'app store should have showReview: true').toEqual(true);
      expect(get.reviewUsername(0), 'username should be visible').toBeVisible();
      expect(get.nextNav(), 'next nav should be displayed').toBeVisible();
      expect(get.nextNav(), 'next nav should be disabled').toHaveAttribute('disabled');
      expect(get.prevNav(), 'prev nav should be displayed').toBeVisible();
      expect(get.prevNav(), 'prev nav should be disabled').toHaveAttribute('disabled');
      expect(
        get.reviewLoadingResponse(),
        'Loading Responses pending state text should be displayed in the ReviewModal',
      ).toBeVisible();
      done();
    });

    test('fetch network error and retry', async (done) => {
      await resolveFns.fetch.networkError();
      await waitForRequestStatus(RequestKeys.fetchSubmission, RequestStates.failed);
      expect(
        await find.reviewLoadErrorHeading(),
        'Load Submission error should be displayed in ReviewModal',
      ).toBeVisible();
      // fetch: retry and succeed
      await userEvent.click(get.reviewRetryLink());
      await waitForRequestStatus(RequestKeys.fetchSubmission, RequestStates.pending);
      done()
    });

    test('fetch success and nav chain', async (done) => {
      let showRubric = false;
      // fetch: success with chained navigation
      const verifyFetchSuccess = async (submissionIndex) => {
        const submissionString = `for submission ${submissionIndex}`;
        const submission = submissions[submissionIndex];
        const forceAndVerifyFetchSuccess = async () => {
          await resolveFns.fetch.success();
          await waitForRequestStatus(RequestKeys.fetchSubmission, RequestStates.completed);
          expect(
            get.reviewGradingStatus(submission),
            `Should display current submission grading status ${submissionString}`,
          ).toBeVisible();
        };
        await forceAndVerifyFetchSuccess();

        showRubric = showRubric || selectors.grading.selected.isGrading(getState());

        const verifyRubricVisibility = async () => {
          getState();
          expect(
            state.app.showRubric,
            `${showRubric ? 'Should' : 'Should not'} show rubric ${submissionString}`,
          ).toEqual(showRubric);
          if (showRubric) {
            expect(
              el.getByText(appMessages.ReviewActions.hideRubric),
              `Hide Rubric button should be visible when rubric is shown ${submissionString}`,
            ).toBeVisible();

          } else {
            expect(
              el.getByText(appMessages.ReviewActions.showRubric),
              `Show Rubric button should be visible when rubric is hidden ${submissionString}`,
            ).toBeVisible();
          }
        }
        await verifyRubricVisibility();

        // loads current submission
        const testSubmissionGradingState = () => {
          expect(
            state.grading.current,
            `Redux current grading state should load the current submission ${submissionString}`,
          ).toEqual({
            submissionUUID: submissionUUIDs[submissionIndex],
            ...submissions[submissionIndex],
          });
        };
        testSubmissionGradingState();

        const testNavState = () => {
          const expectDisabled = (getNav, name) => (
             expect(getNav(), `${name} should be disabled`).toHaveAttribute('disabled')
          );
          const expectEnabled = (getNav, name) => (
             expect(getNav(), `${name} should be enabled`).not.toHaveAttribute('disabled')
          );

          (submissionIndex > 0 ? expectEnabled : expectDisabled)(get.prevNav, 'Prev nav');
          const hasNext = submissionIndex < submissions.length - 1;
          (hasNext ? expectEnabled : expectDisabled)(get.nextNav, 'Next nav');
        };
        testNavState();
      };
      await verifyFetchSuccess(0);
      for (let i = 1; i < 5; i++) {
        await clickNext();
        await verifyFetchSuccess(i);
      }
      for (let i = 3; i >= 0; i--) {
        await clickPrev();
        await verifyFetchSuccess(i);
      }
      done();
    });

    describe('grading (basic)', () => {
      beforeEach(async () => {
        await resolveFns.fetch.success();
        await waitForRequestStatus(RequestKeys.fetchSubmission, RequestStates.completed);
        await userEvent.click(await find.startGradingBtn());
      });
      /*
        test('pending', async (done) => {
          done();
        });
        test('error', async (done) => {
          done();
        });
      */
      describe('active grading', () => {
        beforeEach(async () => {
          await resolveFns.lock.success();
        });
        const selectedOptions = [1, 2];
        const feedback = ['feedback 0', 'feedback 1'];
        const overallFeedback = 'some overall feedback';
        const setGrade = async () => {
          for (let i of [0, 1]) {
            await userEvent.click(get.rubricOption(i, selectedOptions[i]));
            await userEvent.type(get.rubricCriterionFeedback(i), feedback[i]);
          }
          await userEvent.type(get.rubricFeedbackInput(), overallFeedback);
        };
        const checkGradingState = () => {
          const { gradingData } = getState().grading;
          const entry = gradingData[submissionUUIDs[0]];
          const checkCriteria = (index) => {
            const criterion = entry.criteria[index];
            const rubricOptions = rubricConfig.criteria[index].options;
            expect(criterion.selectedOption).toEqual(rubricOptions[selectedOptions[index]].name);
            expect(criterion.feedback).toEqual(feedback[index]);
          }
          [0, 1].forEach(checkCriteria);
          expect(entry.overallFeedback).toEqual(overallFeedback);
        }
        const checkGradeSuccess = () => {
          const { gradeData, current } = getState().grading;
          const entry = gradeData[submissionUUIDs[0]];
          const checkCriteria = (index) => {
            const criterion = entry.criteria[index];
            const rubricOptions = rubricConfig.criteria[index].options;
            expect(criterion.selectedOption).toEqual(rubricOptions[selectedOptions[index]].name);
            expect(criterion.feedback).toEqual(feedback[index]);
          }
          [0, 1].forEach(checkCriteria);
          expect(entry.overallFeedback).toEqual(overallFeedback);
          expect(current.gradeStatus).toEqual(gradeStatuses.graded);
          expect(current.lockStatus).toEqual(lockStatuses.unlocked);
        }
        /*
          test('submit pending', async (done) => {
            done();
          });
          test('submit failed', async (done) => {
            done();
          });
        */
        test('submit grade (success)', async (done) => {
          expect(await find.submitGradeBtn()).toBeVisible();
          await setGrade();
          checkGradingState();
          await userEvent.click(get.submitGradeBtn());
          await resolveFns.updateGrade.success();
          checkGradeSuccess();
          done();
        });
      });
    });
  });
});
