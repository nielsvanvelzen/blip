/** @jsx React.DOM */
var React = window.React;
var _ = window._;

var SimpleForm = require('../../components/simpleform');

var Login = React.createClass({
  propTypes: {
    onValidate: React.PropTypes.func.isRequired,
    onSubmit: React.PropTypes.func.isRequired,
    onSubmitSuccess: React.PropTypes.func.isRequired
  },

  formInputs: [
    {name: 'username', label: 'Email'},
    {name: 'password', label: 'Password', type: 'password'}
  ],

  getInitialState: function() {
    return {
      working: false,
      formValues: {},
      validationErrors: {},
      notification: null
    };
  },

  render: function() {
    var form = this.renderForm();

    /* jshint ignore:start */
    return (
      <div className="login">
        <ul>
          <li><a href="#/">Blip</a></li>
          <li><a href="#/signup" className="js-signup-link">Sign up</a></li>
        </ul>
        {form}
      </div>
    );
    /* jshint ignore:end */
  },

  renderForm: function() {
    var submitButtonText = this.state.working ? 'Logging in...' : 'Login';

    /* jshint ignore:start */
    return (
      <SimpleForm
        inputs={this.formInputs}
        formValues={this.state.formValues}
        validationErrors={this.state.validationErrors}
        submitButtonText={submitButtonText}
        submitDisabled={this.state.working}
        onSubmit={this.handleSubmit}
        notification={this.state.notification}/>
    );
    /* jshint ignore:end */
  },

  handleSubmit: function(formValues) {
    var self = this;

    if (this.state.working) {
      return;
    }

    this.resetFormStateBeforeSubmit(formValues);

    var validationErrors = this.validateFormValues(formValues);
    if (!_.isEmpty(validationErrors)) {
      return;
    }

    this.submitFormValues(formValues);
  },

  resetFormStateBeforeSubmit: function(formValues) {
    this.setState({
      working: true,
      formValues: formValues,
      validationErrors: {},
      notification: null
    });
  },

  validateFormValues: function(formValues) {
    var validationErrors = {};
    var validate = this.props.onValidate;

    validationErrors = validate(formValues);
    if (!_.isEmpty(validationErrors)) {
      this.setState({
        working: false,
        validationErrors: validationErrors,
        notification: {
          type: 'error',
          message:'Some entries are invalid.'
        }
      });
    }

    return validationErrors;
  },

  submitFormValues: function(formValues) {
    var self = this;
    var submit = this.props.onSubmit;

    submit(formValues, function(err) {
      if (err) {
        self.setState({
          working: false,
          notification: {
            type: 'error',
            message: err.message || 'An error occured while logging in.'
          }
        });
        return;
      }
      self.props.onSubmitSuccess();
      // NOTE: We don't set state `working: false` because it seems to trigger
      // a re-render of the login page before the redirect in `onSubmitSuccess`
      // making an unpleasant UI flash. We don't really need it as the login
      // page will be recreated on next visit to `/login`.
    });
  }
});

module.exports = Login;