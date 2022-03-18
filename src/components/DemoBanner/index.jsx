import React from 'react';
import PropTypes from 'prop-types';

import { PageBanner } from '@edx/paragon';
import { FormattedMessage } from '@edx/frontend-platform/i18n';

import messages from './messages';

/**
 * <DemoBanner />
 */
export const DemoBanner = () => (
  process.env.REACT_APP_NOT_ENABLED ? (
    <PageBanner><FormattedMessage {...messages.demoBannerMessage} /></PageBanner>
  ) : null
);
DemoBanner.defaultProps = {
};
DemoBanner.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.string,
    defaultMessage: PropTypes.string,
  }).isRequired,
};

export default DemoBanner;
