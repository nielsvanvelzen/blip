/*
 * == BSD2 LICENSE ==
 * Copyright (c) 2018, Tidepool Project
 *
 * This program is free software; you can redistribute it and/or modify it under
 * the terms of the associated License, which is identical to the BSD 2-Clause
 * License as published by the Open Source Initiative at opensource.org.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the License for more details.
 *
 * You should have received a copy of the License along with this program; if
 * not, you can obtain one from Tidepool Project at tidepool.org.
 * == BSD2 LICENSE ==
 */

import { createSelector } from 'reselect';
import _ from 'lodash';
import utils from '../../core/utils'

const getPatientData = (state, props) => _.get(
  state,
  'blip.data.combined',
  []
);

const getPatientDataFetchedUntil = (state, props) => _.get(
  state,
  'blip.data.fetchedUntil'
);

export const getfetchedPatientDataRange = createSelector(
  [ getPatientData, getPatientDataFetchedUntil ],
  (data, fetchedUntil) =>  {
    const diabetesDataRange = utils.getDiabetesDataRange(data);
    return _.assign({}, diabetesDataRange, {
      fetchedUntil,
    });
  }
);
