import React, { useEffect, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import compact from 'lodash/compact';
import get from 'lodash/get';
import includes from 'lodash/includes';
import isEmpty from 'lodash/isEmpty';
import keyBy from 'lodash/keyBy';
import keys from 'lodash/keys';
import map from 'lodash/map';
import omitBy from 'lodash/omitBy';
import reject from 'lodash/reject';
import without from 'lodash/without';
import { useFormik } from 'formik';
import InputMask from 'react-input-mask';
import CloseRoundedIcon from '@material-ui/icons/CloseRounded';
import CheckCircleRoundedIcon from '@material-ui/icons/CheckCircleRounded';
import ErrorOutlineRoundedIcon from '@material-ui/icons/ErrorOutlineRounded';
import { Box, Flex, Text, BoxProps } from 'rebass/styled-components';

import * as actions from '../../redux/actions';
import Checkbox from '../../components/elements/Checkbox';
import TextInput from '../../components/elements/TextInput';
import Button from '../../components/elements/Button';
import { TagList } from '../../components/elements/Tag';
import { getCommonFormikFieldProps } from '../../core/forms';
import { dateRegex, patientSchema as validationSchema } from '../../core/clinicUtils';
import { accountInfoFromClinicPatient } from '../../core/personutils';
import { Body0 } from '../../components/elements/FontStyles';
import { borders, colors } from '../../themes/baseTheme';
import Icon from '../elements/Icon';
import DexcomLogoIcon from '../../core/icons/DexcomLogo.svg';

function getFormValues(source, clinicPatientTags, disableDexcom) {
  const connectDexcom = (!!source?.dexcomConnectState || (!disableDexcom && source?.connectDexcom)) || false;

  return {
    birthDate: source?.birthDate || '',
    email: source?.email || '',
    fullName: source?.fullName || '',
    mrn: source?.mrn || '',
    tags: reject(source?.tags || [], tagId => !clinicPatientTags?.[tagId]),
    connectDexcom,
    dexcomConnectState: connectDexcom ? source?.dexcomConnectState || 'pending' : undefined,
  };
}

function emptyValuesFilter(value, key) {
  // We want to allow sending an empty `tags` array. Otherwise, strip empty fields from payload.
  return !includes(['tags', 'connectDexcom'], key) && isEmpty(value);
}

export const PatientForm = (props) => {
  const { t, api, onFormChange, patient, trackMetric, ...boxProps } = props;
  const dispatch = useDispatch();
  const selectedClinicId = useSelector((state) => state.blip.selectedClinicId);
  const clinic = useSelector(state => state.blip.clinics?.[selectedClinicId]);
  const dateInputFormat = 'MM/DD/YYYY';
  const dateMaskFormat = dateInputFormat.replace(/[A-Z]/g, '9');
  const [initialValues, setInitialValues] = useState({});
  const showTags = clinic?.tier >= 'tier0200' && !!clinic?.patientTags?.length;
  const clinicPatientTags = useMemo(() => keyBy(clinic?.patientTags, 'id'), [clinic?.patientTags]);
  const showConnectDexcom = !!selectedClinicId && !patient?.dexcomConnectState;
  const [disableConnectDexcom, setDisableConnectDexcom] = useState(false);
  const showDexcomConnectState = !!selectedClinicId && !!patient?.dexcomConnectState;

  const dexcomConnectStateUI = {
    pending: {
      color: 'mediumGrey',
      icon: ErrorOutlineRoundedIcon,
      label: t('Pending connection with'),
    },
    connected: {
      color: 'brand.dexcom',
      icon: CheckCircleRoundedIcon,
      label: t('Connected with'),
    },
    disconnected: {
      color: 'mediumGrey',
      icon: ErrorOutlineRoundedIcon,
      label: t('Disconnected from'),
    },
    error: {
      color: 'feedback.danger',
      icon: ErrorOutlineRoundedIcon,
      label: t('Error connecting to'),
    },
    unknown: {
      color: 'mediumGrey',
      icon: ErrorOutlineRoundedIcon,
      label: t('Unknown connection to'),
    },
  };

  const dexcomConnectState = includes(keys(dexcomConnectStateUI), patient?.dexcomConnectState)
    ? patient.dexcomConnectState
    : 'unknown';

  const formikContext = useFormik({
    initialValues: getFormValues(patient, clinicPatientTags),
    onSubmit: values => {
      const action = patient?.id ? 'edit' : 'create';
      const context = selectedClinicId ? 'clinic' : 'vca';

      const actionMap = {
        edit: {
          clinic: {
            handler: 'updateClinicPatient',
            args: () => [selectedClinicId, patient.id, omitBy({ ...patient, ...getFormValues(values, clinicPatientTags, disableConnectDexcom) }, emptyValuesFilter)],
          },
          vca: {
            handler: 'updatePatient',
            args: () => [accountInfoFromClinicPatient(omitBy({ ...patient, ...getFormValues(values, clinicPatientTags) }, emptyValuesFilter))],
          },
        },
        create: {
          clinic: {
            handler: 'createClinicCustodialAccount',
            args: () => [selectedClinicId, omitBy(values, emptyValuesFilter, disableConnectDexcom)],
          },
          vca: {
            handler: 'createVCACustodialAccount',
            args: () => [accountInfoFromClinicPatient(omitBy(values, emptyValuesFilter)).profile],
          },
        }
      }

      if (!initialValues.email && values.email) {
        trackMetric(`${selectedClinicId ? 'Clinic' : 'Clinician'} - add patient email saved`);
      }

      dispatch(actions.async[actionMap[action][context].handler](api, ...actionMap[action][context].args()));
    },
    validationSchema,
  });

  const {
    setFieldValue,
    setValues,
    values,
  } = formikContext;

  useEffect(() => {
    // set form field values and store initial patient values on patient load
    const patientValues = getFormValues(patient, clinicPatientTags);
    setValues(patientValues);
    setInitialValues(patientValues);
  }, [patient, clinicPatientTags]);

  useEffect(() => {
    onFormChange(formikContext);
  }, [values, clinicPatientTags]);

  useEffect(() => {
    setDisableConnectDexcom(isEmpty(values.email));
  }, [values.email]);

  // Pull the patient on load to ensure the most recent dexcom connection state is made available
  useEffect(() => {
    if (selectedClinicId && patient?.id) dispatch(actions.async.fetchPatientFromClinic.bind(null, api, selectedClinicId, patient.id)())
  }, []);

  const handleResendDexcomConnectEmail = () => {
    trackMetric('Clinic - Resend Dexcom connect email', { clinicId: selectedClinicId })
    console.log('resend email!!!!')
  };

  return (
    <Box
      as="form"
      id="clinic-patient-form"
      {...boxProps}
    >
      <Box mb={4}>
        <TextInput
          {...getCommonFormikFieldProps('fullName', formikContext)}
          label={t('Full Name')}
          placeholder={t('Full Name')}
          variant="condensed"
          width="100%"
        />
      </Box>

      <Box mb={4}>
        <InputMask
          mask={dateMaskFormat}
          maskPlaceholder={dateInputFormat.toLowerCase()}
          {...getCommonFormikFieldProps('birthDate', formikContext)}
          value={get(values, 'birthDate', '').replace(dateRegex, '$2/$3/$1')}
          onChange={e => {
            formikContext.setFieldValue('birthDate', e.target.value.replace(dateRegex, '$3-$1-$2'), e.target.value.length === 10);
          }}
          onBlur={e => {
            formikContext.setFieldTouched('birthDate');
            formikContext.setFieldValue('birthDate', e.target.value.replace(dateRegex, '$3-$1-$2'));
          }}
        >
          <TextInput
            name="birthDate"
            label={t('Birthdate')}
            placeholder={dateInputFormat.toLowerCase()}
            variant="condensed"
            width="100%"
          />
        </InputMask>
      </Box>

      <Box mb={4}>
        <TextInput
          {...getCommonFormikFieldProps('mrn', formikContext)}
          label={t('MRN (optional)')}
          placeholder={t('MRN')}
          variant="condensed"
          width="100%"
        />
      </Box>

      <Box mb={2}>
        <TextInput
          {...getCommonFormikFieldProps('email', formikContext)}
          label={t('Email (optional)')}
          placeholder={t('Email')}
          variant="condensed"
          width="100%"
          disabled={patient?.id && !patient?.permissions?.custodian}
        />
      </Box>

      <Body0 fontWeight="medium">
        {t('If you want your patients to upload their data from home, you must include their email address.')}
      </Body0>

      {showTags && (
        <Box
          mt={3}
          sx={{
            borderTop: borders.default,
          }}
        >
          {!!values.tags.length && (
            <Box className='selected-tags' mt={3} mb={1} fontSize={0}>
              <Text mb={1} fontWeight="medium" color="text.primary">{t('Assigned Patient Tags')}</Text>

              <TagList
                tags={compact(map(values.tags, tagId => clinicPatientTags[tagId]))}
                tagProps={{
                  onClickIcon: tagId => {
                    setFieldValue('tags', without(values.tags, tagId));
                  },
                  icon: CloseRoundedIcon,
                  iconColor: 'white',
                  iconFontSize: 1,
                  color: 'white',
                  backgroundColor: 'purpleMedium',
                }}
              />
            </Box>
          )}

          {values.tags.length < (clinic?.patientTags || []).length && (
            <Box className='available-tags' alignItems="center" mb={1} mt={3} fontSize={0} >
              <Text mb={1} fontWeight="medium" color="text.primary">{t('Available Patient Tags')}</Text>

              <TagList
                tags={map(reject(clinic?.patientTags, ({ id }) => includes(values.tags, id)), ({ id }) => clinicPatientTags?.[id])}
                tagProps={{
                  onClick: tagId => {
                    setFieldValue('tags', [...values.tags, tagId]);
                  },
                }}
              />
            </Box>
          )}
        </Box>
      )}

      {showConnectDexcom && (
        <Box
          mt={3}
          pt={3}
          sx={{
            borderTop: borders.default,
          }}
        >
          <Checkbox
            {...getCommonFormikFieldProps('connectDexcom', formikContext, 'checked')}
            disabled={disableConnectDexcom}
            label={(
              <Flex
                alignItems="center"
              >
                <Text mr={1} mt={1} fontSize={0}>
                  {t('Connect with')}
                </Text>

                <Icon
                  variant="static"
                  iconSrc={DexcomLogoIcon}
                  sx={{
                    img: {
                      filter: disableConnectDexcom ? 'saturate(0%) brightness(130%)' : 'none',
                    },
                  }}
                  label="Dexcom"
                />
              </Flex>
            )}
          />

          <Body0 mt={1} fontWeight="medium">
            {t('If this box is checked, patient will receive an email to authorize sharing Dexcom data with Tidepool.')}
          </Body0>
        </Box>
      )}

      {showDexcomConnectState && (
        <Box
          mt={3}
          pt={3}
          color={dexcomConnectStateUI[dexcomConnectState].color}
          sx={{
            borderTop: borders.default,
          }}
        >
          <Flex
            alignItems="center"
          >
            <Icon
              variant="static"
              icon={dexcomConnectStateUI[dexcomConnectState].icon}
              label={`${dexcomConnectStateUI[dexcomConnectState].label} Dexcom`}
              sx={dexcomConnectStateUI[dexcomConnectState].iconStyles}
            />

            <Text mx={1} mt={1} fontSize={0}>
              {dexcomConnectStateUI[dexcomConnectState].label}
            </Text>

            <Icon
              variant="static"
              iconSrc={DexcomLogoIcon}
              label="Dexcom"
            />
          </Flex>

          {dexcomConnectState === 'pending' && (
            <Body0 mt={2} fontWeight="medium" color={colors.mediumGrey} sx={{ display: 'inline-block', lineHeight: '0.5 !important'}}>
              {t('Patient has received an email to authorize Dexcom data sharing with Tidepool but they have not taken any action yet.')}

              <Button
                variant="textPrimary"
                onClick={handleResendDexcomConnectEmail}
                fontSize={0}
                sx={{ display: 'inline-block !important'}}
              >
                {t('Resend email')}
              </Button>
            </Body0>
          )}
        </Box>
      )}
    </Box>
  );
};

PatientForm.propTypes = {
  ...BoxProps,
  api: PropTypes.object.isRequired,
  onFormChange: PropTypes.func.isRequired,
  patient: PropTypes.object,
  t: PropTypes.func.isRequired,
  trackMetric: PropTypes.func.isRequired,
};

export default translate()(PatientForm);
