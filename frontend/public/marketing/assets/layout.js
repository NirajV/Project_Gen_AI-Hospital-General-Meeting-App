/* BioMedMeet — shared nav + footer renderer.
   Each marketing page embeds <div data-bm-nav></div> and <div data-bm-footer></div>;
   this script fills them at load time. Keeps pages ~100 lines instead of ~300. */

(function () {
    var NAV_HTML = ''
        + '<nav class="bm-nav" aria-label="Primary">'
        + '  <div class="bm-container bm-nav-inner">'
        + '    <a href="/marketing/" class="bm-logo" aria-label="BioMedMeet home">'
        + '      <svg class="bm-logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
        + '        <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>'
        + '      BioMedMeet'
        + '    </a>'
        + '    <button class="bm-nav-mobile-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="primary-menu" data-mobile-toggle>'
        + '      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
        + '        <line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line>'
        + '      </svg>'
        + '    </button>'
        + '    <ul class="bm-nav-links" id="primary-menu">'
        + '      <li><a href="/marketing/#features">Features</a></li>'
        + '      <li><a href="/marketing/how-it-works.html">How it works</a></li>'
        + '      <li><a href="/marketing/security.html">Security</a></li>'
        + '      <li><a href="/marketing/#faq">FAQ</a></li>'
        + '      <li><a href="/marketing/contact.html">Contact</a></li>'
        + '      <li><a href="/login" class="bm-btn bm-btn-outline" data-testid="nav-signin">Sign in</a></li>'
        + '      <li><a href="/marketing/contact.html#demo" class="bm-btn bm-btn-primary" data-testid="nav-demo">Request a demo</a></li>'
        + '    </ul>'
        + '  </div>'
        + '</nav>';

    var FOOTER_HTML = ''
        + '<footer class="bm-footer">'
        + '  <div class="bm-container">'
        + '    <div class="bm-footer-grid">'
        + '      <div>'
        + '        <a href="/marketing/" class="bm-logo" style="color: #fff;">'
        + '          <svg class="bm-logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="color: #fff;"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>'
        + '          BioMedMeet'
        + '        </a>'
        + '        <p style="font-size: 14px; color: var(--bm-slate-400); margin: 16px 0 0; max-width: 320px;">'
        + '          Hospital case meeting software, designed with clinicians.'
        + '        </p>'
        + '      </div>'
        + '      <div>'
        + '        <h4>Product</h4>'
        + '        <ul>'
        + '          <li><a href="/marketing/#features">Features</a></li>'
        + '          <li><a href="/marketing/features/case-meetings.html">Case meetings</a></li>'
        + '          <li><a href="/marketing/features/patient-management.html">Patient management</a></li>'
        + '          <li><a href="/marketing/features/decisions-treatment.html">Decisions &amp; treatment plans</a></li>'
        + '          <li><a href="/marketing/features/security-compliance.html">Security &amp; compliance</a></li>'
        + '        </ul>'
        + '      </div>'
        + '      <div>'
        + '        <h4>Resources</h4>'
        + '        <ul>'
        + '          <li><a href="/marketing/how-it-works.html">How it works</a></li>'
        + '          <li><a href="/marketing/security.html">Security overview</a></li>'
        + '          <li><a href="/marketing/contact.html#cheat-sheet">Quick reference (PDF)</a></li>'
        + '          <li><a href="/marketing/contact.html#demo">Request a demo</a></li>'
        + '          <li><a href="/login">Sign in</a></li>'
        + '        </ul>'
        + '      </div>'
        + '      <div>'
        + '        <h4>Contact</h4>'
        + '        <ul>'
        + '          <li><a href="mailto:Niraj.k.vishwakarma@gmail.com">Niraj.k.vishwakarma@gmail.com</a></li>'
        + '          <li><a href="tel:+14848026153">+1 484 802 6153</a></li>'
        + '          <li><a href="/marketing/contact.html">Privacy / Terms / BAA</a></li>'
        + '        </ul>'
        + '      </div>'
        + '    </div>'
        + '    <div class="bm-footer-bottom">'
        + '      <span>&copy; 2026 BioMedMeet. All rights reserved.</span>'
        + '      <span>Designed with clinicians &middot; Built for hospitals</span>'
        + '    </div>'
        + '  </div>'
        + '</footer>';

    function inject() {
        var navSlot = document.querySelector('[data-bm-nav]');
        var footerSlot = document.querySelector('[data-bm-footer]');
        if (navSlot) navSlot.outerHTML = NAV_HTML;
        if (footerSlot) footerSlot.outerHTML = FOOTER_HTML;

        // Wire mobile menu after nav is injected.
        var btn = document.querySelector('[data-mobile-toggle]');
        var menu = document.getElementById('primary-menu');
        if (btn && menu) {
            btn.addEventListener('click', function () {
                var open = menu.classList.toggle('is-open');
                btn.setAttribute('aria-expanded', String(open));
            });
            menu.querySelectorAll('a').forEach(function (a) {
                a.addEventListener('click', function () {
                    menu.classList.remove('is-open');
                    btn.setAttribute('aria-expanded', 'false');
                });
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inject);
    } else {
        inject();
    }
})();
