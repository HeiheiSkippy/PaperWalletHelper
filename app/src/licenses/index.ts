import { APACHE_2_0, CC0_1_0 } from './fullTexts';
import type { ThirdParty } from './types';

export type { ThirdParty } from './types';
export { JS_LIBRARIES, NATIVE_LIBRARIES } from './thirdParty';

export const REPO_URL = 'https://github.com/HeiheiSkippy/PaperWalletHelper';

const MIT = (holder: string) => `MIT License

${holder}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

const ISC = (holder: string) => `ISC License

${holder}

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.`;

const BSD = (holder: string, three: boolean) => `${three ? 'BSD 3-Clause' : 'BSD 2-Clause'} License

${holder}
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.
${
  three
    ? `
3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.
`
    : ''
}
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.`;

export function licenseText(item: ThirdParty): string {
  switch (item.license) {
    case 'MIT':
      return MIT(item.holder);
    case 'ISC':
      return ISC(item.holder);
    case 'BSD-2-Clause':
      return BSD(item.holder, false);
    case 'BSD-3-Clause':
      return BSD(item.holder, true);
    case '(MIT AND BSD-3-Clause)':
      return `${MIT(item.holder)}\n\n${BSD(item.holder, true)}`;
    case 'Apache-2.0':
      return `${item.holder}\n\n${APACHE_2_0}`;
    case 'CC0-1.0':
      return `${item.holder}\n\n${CC0_1_0}`;
    // Google's own terms are published only as web pages.
    case 'ML Kit Terms of Service':
      return `${item.holder}\n\nML Kit Terms of Service\nhttps://developers.google.com/ml-kit/terms`;
    case 'Android Software Development Kit License':
      return `${item.holder}\n\nAndroid Software Development Kit License\nhttps://developer.android.com/studio/terms`;
  }
  throw new Error(`no text for ${item.license}`);
}

// Short names for the list.
export function licenseLabel(license: string): string {
  return license
    .replace(/[()]/g, '')
    .replace(' AND ', ' · ')
    .replace('Apache-2.0', 'Apache 2.0')
    .replace('-Clause', '')
    .replace('CC0-1.0', 'CC0')
    .replace('ML Kit Terms of Service', 'ML Kit ToS')
    .replace('Android Software Development Kit License', 'Android SDK');
}
