import React from 'react';
import PropTypes from 'prop-types';

import { Alert, Button } from '@edx/paragon';
import { Info } from '@edx/paragon/icons';
import { FormattedMessage } from '@edx/frontend-platform/i18n';

const messageShape = PropTypes.shape({
  id: PropTypes.string,
  defaultMessage: PropTypes.string,
});

const ReviewError = ({
  actions: {
    cancel,
    confirm,
  },
  headingMessage,
  children,
}) => (
  <Alert
    variant="danger"
    icon={Info}
    {...(confirm && ({
      actions: ([
        <Button onClick={confirm.onClick}>
          <FormattedMessage {...confirm.message} />
        </Button>,
      ]),
    }))}
    {...(cancel && ({
      dismissible: true,
      onClose: cancel.onClick,
    }))}
  >
    <Alert.Heading><FormattedMessage {...headingMessage} /></Alert.Heading>
    {children}
  </Alert>
);
ReviewError.defaultProps = {
  actions: {},
};
ReviewError.propTypes = {
  actions: PropTypes.shape({
    cancel: PropTypes.shape({
      onClick: PropTypes.func,
      message: messageShape,
    }),
    confirm: PropTypes.shape({
      onClick: PropTypes.func,
      message: messageShape,
    }),
  }),
  headingMessage: messageShape.isRequired,
  children: PropTypes.node.isRequired,
};

export default ReviewError;
