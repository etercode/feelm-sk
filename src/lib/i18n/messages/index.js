/*
 * Every dictionary, keyed by locale code.
 *
 * All four are bundled rather than fetched on demand. Together they are a few
 * tens of kilobytes before compression — less than one poster — and loading a
 * language over the network would mean the site could not render until it
 * arrived, which is exactly the flash of English the cookie exists to prevent.
 */

import { az } from './az.js';
import { en } from './en.js';
import { ru } from './ru.js';
import { tr } from './tr.js';

/** @type {Record<string, Record<string, string>>} */
export const messages = { en, az, tr, ru };
