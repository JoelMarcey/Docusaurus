/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {LoadContext, Plugin, Props} from '@docusaurus/types';
import {UserPluginOptions, PluginContext, RedirectMetadata} from './types';

import normalizePluginOptions from './normalizePluginOptions';
import collectRedirects from './collectRedirects';
import writeRedirectFiles, {
  toRedirectFilesMetadata,
  RedirectFileMetadata,
} from './writeRedirectFiles';
import {removePrefix, addLeadingSlash} from '@docusaurus/utils';
import chalk from 'chalk';

export default function pluginClientRedirectsPages(
  context: LoadContext,
  opts: UserPluginOptions,
): Plugin<unknown> {
  const {trailingSlash} = context.siteConfig;

  const options = normalizePluginOptions(opts);

  // Special case, when using trailingSlash=false we output /xyz.html files instead of /xyz/index.html
  // It makes no sense to use option fromExtensions=["html"]: the redirect files would be the same as the original files
  if (options.fromExtensions.includes('html') && trailingSlash === false) {
    console.warn(
      chalk.yellow(`Using the Docusaurus redirect plugin with fromExtensions=['html'] and siteConfig.trailingSlash=false is prevented.
It would lead the redirect plugin to override all the page.html files created by Docusaurus.`),
    );
    options.fromExtensions = options.fromExtensions.filter(
      (ext) => ext !== 'html',
    );
  }

  return {
    name: 'docusaurus-plugin-client-redirects',
    async postBuild(props: Props) {
      const pluginContext: PluginContext = {
        relativeRoutesPaths: props.routesPaths.map(
          (path) => `${addLeadingSlash(removePrefix(path, props.baseUrl))}`,
        ),
        baseUrl: props.baseUrl,
        outDir: props.outDir,
        options,
      };

      const redirects: RedirectMetadata[] = collectRedirects(
        pluginContext,
        trailingSlash,
      );

      const redirectFiles: RedirectFileMetadata[] = toRedirectFilesMetadata(
        redirects,
        pluginContext,
        trailingSlash,
      );

      // Write files only at the end: make code more easy to test without IO
      await writeRedirectFiles(redirectFiles);
    },
  };
}
