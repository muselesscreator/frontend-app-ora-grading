import React from 'react';
import PropTypes from 'prop-types';
import { getTextFileContent } from 'data/services/download';

export class TXTRenderer extends React.Component {
  constructor(props) {
    super(props);
    this.state = { content: '' };
    this.onSuccess = this.onSuccess.bind(this);
  }

  componentDidMount() {
    getTextFileContent(this.props.url, {
      onSuccess: this.onSuccess,
      onError: this.props.onError,
    });
  }

  onSuccess(data) {
    this.props.onSuccess();
    this.setState({ content: data });
  }

  render() {
    return (
      <pre className="txt-renderer">
        {this.state.content}
      </pre>
    );
  }
}
TXTRenderer.defaultProps = {};

TXTRenderer.propTypes = {
  url: PropTypes.string.isRequired,
  onError: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
};

export default TXTRenderer;
