import React from 'react';
import { translate, Trans } from 'react-i18next';
import { Flex, Box, Text } from 'rebass/styled-components';
import customProtocolCheck from 'custom-protocol-check';
import { Redirect } from 'react-router-dom';
import { Subheading, Title } from '../../components/elements/FontStyles';
import Button from '../../components/elements/Button';

let launched = false;
let win = window;

const UploadRedirect = (props) => {
  const { t } = props;
  const linkUrl = `tidepooluploader://localhost/keycloak-redirect${props.location.hash}`;

  if (!props.location.hash) {
    return <Redirect to="/login" />;
  }

  if (!launched) {
    if (props.location.hash) {
      customProtocolCheck(
        linkUrl,
        () => {},
        () => {
          launched = true;
        },
        5000
      );
    }
  }

  const handleClose = () => {
    win.close();
  };

  return (
    <Flex justifyContent="center" alignItems="center" height="75vh">
      <Box>
        <Text fontWeight="medium">
          <Box>
            <Flex alignItems="center" flexDirection="column">
              <Title mb="10px">
                <Trans>
                  Click <Text as="span" fontWeight="bold">Open Tidepool Uploader</Text> on the dialog shown by your browser
                </Trans>
              </Title>
              <Subheading mb="10px">
                <Trans>
                  If you don’t see a dialog, click <Text as="span" fontWeight="bold">Launch Uploader</Text> below
                </Trans>
              </Subheading>
              <Subheading mb="20px">
                <Trans>
                  Once Tidepool Uploader has launched, you can <a id="close_browser" onClick={handleClose} style={{ cursor: 'pointer' }}>click here</a> to close this window.
                </Trans>
              </Subheading>
              <a id="launch_uploader" href={linkUrl}>
                <Button variant="primary" fontSize={3}>
                  {t('Launch Uploader')}
                </Button>
              </a>
            </Flex>
          </Box>
        </Text>
      </Box>
    </Flex>
  );
};

export default translate()(UploadRedirect);
