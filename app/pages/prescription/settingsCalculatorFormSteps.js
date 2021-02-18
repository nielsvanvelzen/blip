import React from 'react';
import { translate } from 'react-i18next';
import { FastField, useFormikContext } from 'formik';
import { Box, Flex } from 'rebass/styled-components';
import bows from 'bows';
import get from 'lodash/get';
import includes from 'lodash/includes';
import isEmpty from 'lodash/isEmpty';
import map from 'lodash/map';

import { fieldsAreValid, getFieldError } from '../../core/forms';
import { useInitialFocusedInput } from '../../core/hooks';
import i18next from '../../core/language';
import Button from '../../components/elements/Button';
import RadioGroup from '../../components/elements/RadioGroup';
import Select from '../../components/elements/Select';
import TextInput from '../../components/elements/TextInput';
import { Paragraph1, Headline } from '../../components/elements/FontStyles';

import {
  condensedInputStyles,
  fieldsetStyles,
  inputStyles,
} from './prescriptionFormStyles';

import {
  calculateRecommendedTherapySettings,
  calculatorMethodOptions,
  roundValueToIncrement,
  stepValidationFields,
  totalDailyDoseScaleFactorOptions,
  weightUnitOptions,
} from './prescriptionFormConstants';

const t = i18next.t.bind(i18next);
const log = bows('PrescriptionAccount');

export const CalculatorMethod = translate()(props => {
  const { t } = props;
  const formikContext = useFormikContext();
  const initialFocusedInputRef = useInitialFocusedInput();

  const options = !isEmpty(get(formikContext.values, 'calculator.method', ''))
    ? calculatorMethodOptions
    : [ { label: t('Select method'), value: '' }, ...calculatorMethodOptions ];

  return (
    <Box {...fieldsetStyles}>
      <Headline mb={4}>{t('Optional Therapy Settings Calculator')}</Headline>
      <Box mb={4}>
        <Paragraph1>
          {t('Allows for guided entry of total daily dose, weight, or both to generate basal rates, carbohydrate to insulin ratio, and insulin sensitivity factor.')}
        </Paragraph1>
        <Paragraph1>
          {t('All calculations must be confirmed by the provider before use. The suggested results are not a substitute for clinical judgment.')}
        </Paragraph1>
      </Box>
      <FastField
        as={Select}
        themeProps={inputStyles}
        id="calculator.method"
        name="calculator.method"
        options={options}
        error={getFieldError('calculator.method', formikContext)}
        innerRef={initialFocusedInputRef}
      />
    </Box>
  );
});

export const CalculatorInputs = translate()(props => {
  const { t, schema } = props;
  const formikContext = useFormikContext();
  const [results, setResults] = React.useState();

  const {
    setFieldTouched,
    setFieldValue,
    values,
  } = formikContext;

  React.useEffect(() => {
    if (results) {
      setFieldValue('calculator.recommendedBasalRate', results.recommendedBasalRate, true);
      setFieldValue('calculator.recommendedInsulinSensitivity', results.recommendedInsulinSensitivity, true);
      setFieldValue('calculator.recommendedCarbohydrateRatio', results.recommendedCarbohydrateRatio, true);
    }
  }, [results])

  const initialFocusedInputRef = useInitialFocusedInput();
  const method = get(values, 'calculator.method');
  const showTotalDailyDose = includes(['totalDailyDose', 'totalDailyDoseAndWeight'], method);
  const showWeight = includes(['weight', 'totalDailyDoseAndWeight'], method);
  const bgUnits = values.initialSettings.bloodGlucoseUnits;

  return (
    <Box {...fieldsetStyles}>
      <Headline mb={4}>{t('Optional Therapy Settings Calculator')}</Headline>

      <Box mb={4}>
        <Paragraph1>
          {t('All calculations must be confirmed by the provider before use. The suggested results are not a substitute for clinical judgment.')}
        </Paragraph1>
      </Box>

      {showTotalDailyDose && (
        <Box mb={3}>
          <FastField
            as={TextInput}
            label={t('Total Daily Dose')}
            placeholder={t('Enter Patient\'s Total Daily Dose')}
            type="number"
            id="calculator.totalDailyDose"
            name="calculator.totalDailyDose"
            onBlur={e => {
              setFieldTouched('calculator.totalDailyDose');
              setFieldValue('calculator.totalDailyDose', roundValueToIncrement(e.target.value, 0.1));
            }}
            step={1}
            min={0}
            error={getFieldError('calculator.totalDailyDose', formikContext)}
            innerRef={initialFocusedInputRef}
            {...condensedInputStyles}
          />
          <FastField
            as={RadioGroup}
            variant="vertical"
            id="calculator.totalDailyDoseScaleFactor"
            name="calculator.totalDailyDoseScaleFactor"
            onChange={e => {
              setFieldValue('calculator.totalDailyDoseScaleFactor', parseFloat(e.target.value));
            }}
            options={totalDailyDoseScaleFactorOptions}
            error={getFieldError('calculator.totalDailyDoseScaleFactor', formikContext)}
          />
      </Box>
      )}

      {showWeight && (
        <Flex mb={5} alignItems="flex-start">
          <Box flexGrow={6}>
            <FastField
              as={TextInput}
              label={t('Weight')}
              placeholder={t('Enter Patient\'s Weight')}
              type="number"
              id="calculator.weight"
              name="calculator.weight"
              onBlur={e => {
                setFieldTouched('calculator.weight');
                setFieldValue('calculator.weight', roundValueToIncrement(e.target.value, 0.1));
              }}
              step={1}
              min={0}
              themeProps={inputStyles}
              error={getFieldError('calculator.weight', formikContext)}
              innerRef={!showTotalDailyDose ? initialFocusedInputRef : undefined}
            />
          </Box>

          <Box ml={2} mt="1.5em" flexGrow={1}>
            <FastField
              as={Select}
              themeProps={{
                ...inputStyles,
                borderLeft: 'none',
                borderTopLeftRadius: 0,
                borderBottomLeftRadius: 0,
              }}
              id="calculator.weightUnits"
              name="calculator.weightUnits"
              options={weightUnitOptions}
              error={getFieldError('calculator.weightUnits', formikContext)}
            />
          </Box>
        </Flex>
      )}

      <Button
        variant="primary"
        disabled={!fieldsAreValid([
          'calculator.totalDailyDose',
          'calculator.totalDailyDoseScaleFactor',
          'calculator.weight',
          'calculator.weightUnits',
        ], schema, values)}
        onClick={() => setResults(calculateRecommendedTherapySettings(values))}
      >
        {t('Calculate')}
      </Button>

      {results && (
        <Box
          mt={4}
          sx={{ borderLeft: '3px solid', borderLeftColor: 'purpleMedium' }}
          bg="purpleLight"
          p={3}
        >
          <Paragraph1>
            <strong>{t('Basal Rate: ')}</strong>{results.recommendedBasalRate} U/hr
          </Paragraph1>
          <Paragraph1>
            <strong>{t('Insulin Sensitivity: ')}</strong>{results.recommendedInsulinSensitivity} {`${bgUnits}/U`}
          </Paragraph1>
          <Paragraph1>
            <strong>{t('Carbohydrate Ratio: ')}</strong>{results.recommendedCarbohydrateRatio} g/U
          </Paragraph1>
        </Box>
      )}
    </Box>
  );
});

const settingsCalculatorFormSteps = (schema, handlers, values ) => ({
  label: t('Therapy Settings Calculator'),
  optional: true,
  onSkip: handlers.clearCalculator,
  subSteps: [
    {
      disableComplete: isEmpty(get(values, stepValidationFields[2][0][0])) || !fieldsAreValid(stepValidationFields[2][0], schema, values),
      onComplete: () => log('Calculator Method Complete'),
      panelContent: <CalculatorMethod />
    },
    {
      disableComplete: !fieldsAreValid(stepValidationFields[2][1], schema, values),
      onComplete: () => log('Calculator Inputs Complete'),
      panelContent: <CalculatorInputs schema={schema} />
    },
  ],
});

export default settingsCalculatorFormSteps;
