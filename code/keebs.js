/**
 *  <div class="keyboard">
 *    <object data="/img/ergol.svg" class="dk"></object>
 *    <p>
 *      <span>powered by <a
 *        href="https://github.com/OneDeadKey/x-keyboard">x-keyboard</a></span>
 *      <small>géométrie :</small>
 *      <select>
 *        <option>ISO</option>  <!-- filled when loaded -->
 *      </select>
 *    </p>
 *    <dialog>
 *      <input></input>
 *      <x-keyboard></x-keyboard>
 *    </dialog>
 *  </div>
 */

window.addEventListener('DOMContentLoaded', () => {
  'use strict'; // eslint-disable-line

  /**
   * Because of implementation requirements, our SVG keyboard layouts require a
   * bunch of CSS classes to display the proper geometry:
   *  - ISO  => 'iso intlBackslash'
   *  - ANSI => 'ansi'
   *  - TMx  => 'ol60 ergo'
   *  - 4×6  => 'ol50 ergo'
   *  - 3×6  => 'ol40 ergo'
   *
   * By design, the first class in the above list matches the corresponding
   * <x-keyboard> 'geometry' property.
   *
   * An additional class may be specified to display a specific layer:
   *  - 1dk   => 'dk'
   *  - AltGr => 'altgr'
   *
   * This optional class is retrieved from the preview <object> class property.
   *
   * All these class lists are expected to be in the <option> values so that:
   *  - the value can be reused "as is" as the SVG documentElement class;
   *  - the first class can be used as the x-keyboard geometry.
   */
  const geometryClasses = {
    'ISO-A': ['iso', 'intlBackslash', 'am'], // am = angle-mod CSS hack
    'ISO':   ['iso', 'intlBackslash'],       // default / pre-selected value
    'ANSI':  ['ansi'],
    'TMx':   ['ol60', 'ergo'],
    '4×6':   ['ol50', 'ergo'],
    '3×6':   ['ol40', 'ergo'],
  };

for (const keeb of document.querySelectorAll('.keyboard')) {
  const dialog   = keeb.querySelector('dialog');
  const keyboard = keeb.querySelector('x-keyboard');
  const preview  = keeb.querySelector('object');
  const input    = keeb.querySelector('input');
  const geometry = keeb.querySelector('select') || document.getElementById('geometry');
  const button   = keeb.querySelector('button');

  const getGeometry = () => geometryClasses[geometry.value][0].toLowerCase();
  const applyGeometry = () => {
    keyboard.geometry = getGeometry();
    if (preview) {
      const className = geometryClasses[geometry.value]
        .concat(preview.className)
        .join(' ');
      preview.contentDocument.documentElement.setAttribute('class', className);
    }
  };

  geometry.addEventListener('change', applyGeometry);
  preview?.addEventListener('load', () => {
    geometry.innerHTML = Object.keys(geometryClasses)
      .map(name => `<option>${name}</option>`)
      .join('');
    geometry.selectedIndex = 1;
    applyGeometry();
  });

  fetch(keyboard.getAttribute('src'))
    .then(response => response.json() )
    .then(data => {
      keyboard.setKeyboardLayout(data.keymap, data.deadkeys, getGeometry());
      if (button) button.disabled = false;
    });

  if (!keyboard.layout) {
    console.warn('web components are not supported');
    return; // the web component has not been loaded
  }

  if (!input) {
    return;
  }

  /**
   * Open/Close modal
   */
  if (button) button.onclick = () => {
    dialog?.showModal();
    input.value = '';
    input.focus();
  }
  input.onblur = () => {
    keyboard.clearStyle()
    dialog?.close();
  }

  /**
   * Keyboard highlighting & layout emulation
   */

  // required to work around a Chrome bug, see the `keyup` listener below
  const pressedKeys = {};

  // highlight keyboard keys and emulate the selected layout
  input.onkeydown = event => {
    pressedKeys[event.code] = true;
    const value = keyboard.keyDown(event);

    if (event.code === 'Enter') {
      event.target.value = '';
    } else if (value) { // clear text input on <Enter>
      event.target.value += value;
    } else {
      return true; // don't intercept special keys or key shortcuts
    }
    return false; // event has been consumed, stop propagation
  };

  input.addEventListener('keyup', event => {
    if (pressedKeys[event.code]) {
      // expected behavior
      keyboard.keyUp(event);
      delete pressedKeys[event.code];
    } else {
      /**
       * We got a `keyup` event for a key that did not trigger any `keydown`
       * event first: this is a known bug with "real" dead keys on Chrome.
       * As a workaround, emulate a keydown + keyup. This introduces some lag,
       * which can result in a typo (especially when the "real" dead key is used
       * for an emulated dead key) -- but there's not much else we can do.
       */
      event.target.value += keyboard.keyDown(event);
      setTimeout(() => keyboard.keyUp(event), 100);
    }
  });

  /**
   * When pressing a "real" dead key + key sequence, Firefox and Chrome will
   * add the composed character directly to the text input (and nicely trigger
   * an `insertCompositionText` or `insertText` input event, respectively).
   * Not sure wether this is a bug or not -- but this is not the behavior we
   * want for a keyboard layout emulation. The code below works around that.
   */
  input.addEventListener('input', event => {
    if (
      event.inputType === 'insertCompositionText' ||
      event.inputType === 'insertText'
    ) {
      event.target.value = event.target.value.slice(0, -event.data.length);
    }
  });
}

});