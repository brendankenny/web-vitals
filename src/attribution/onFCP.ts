/*
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {getBFCacheRestoreTime} from '../lib/bfcache.js';
import {getLoadState} from '../lib/getLoadState.js';
import {getNavigationEntry} from '../lib/getNavigationEntry.js';
import {onFCP as unattributedOnFCP} from '../onFCP.js';
import {
  FCPMetric,
  FCPMetricWithAttribution,
  FCPReportCallbackWithAttribution,
  ReportOpts,
} from '../types.js';

const attributeFCP = (metric: FCPMetric): FCPMetricWithAttribution => {
  // Type assert to unlock attribution property.
  const attributedMetric = metric as FCPMetricWithAttribution;

  if (attributedMetric.entries.length) {
    const navigationEntry = getNavigationEntry();
    const fcpEntry =
      attributedMetric.entries[attributedMetric.entries.length - 1];

    if (navigationEntry) {
      const activationStart = navigationEntry.activationStart || 0;
      const ttfb = Math.max(0, navigationEntry.responseStart - activationStart);

      attributedMetric.attribution = {
        timeToFirstByte: ttfb,
        firstByteToFCP: attributedMetric.value - ttfb,
        loadState: getLoadState(attributedMetric.entries[0].startTime),
        navigationEntry,
        fcpEntry,
      };
      return attributedMetric;
    }
  }
  // Set an empty object if no other attribution has been set.
  attributedMetric.attribution = {
    timeToFirstByte: 0,
    firstByteToFCP: attributedMetric.value,
    loadState: getLoadState(getBFCacheRestoreTime()),
  };
  return attributedMetric;
};

/**
 * Calculates the [FCP](https://web.dev/fcp/) value for the current page and
 * calls the `callback` function once the value is ready, along with the
 * relevant `paint` performance entry used to determine the value. The reported
 * value is a `DOMHighResTimeStamp`.
 */
export const onFCP = (
  onReport: FCPReportCallbackWithAttribution,
  opts?: ReportOpts
) => {
  unattributedOnFCP((metric: FCPMetric) => {
    const attributedMetric = attributeFCP(metric);
    onReport(attributedMetric);
  }, opts);
};
