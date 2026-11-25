(function () {
  var ENDPOINT = 'https://llp-checkout.littleladybugpress.workers.dev/api/checkout';
  var form = document.getElementById('order-form');
  if (!form) return;

  var qty = document.getElementById('qty');
  var state = document.getElementById('state');
  var out = document.getElementById('estimate');
  var errBox = document.getElementById('form-error');
  var btn = form.querySelector('button[type="submit"]');
  var PRICE = 14.99, RATE = 0.0825;
  var LABEL = 'Continue to secure payment';

  function shipping(n) {
    if (n <= 1) return 4.99;
    if (n === 2) return 5.99;
    return 6.99;
  }

  function money(v) {
    return '$' + v.toFixed(2);
  }

  function update() {
    var n = parseInt(qty.value, 10) || 1;
    var books = n * PRICE;
    var ship = shipping(n);
    var isTX = (state.value || '').trim().toUpperCase() === 'TX';
    var tax = isTX ? Math.round((books + ship) * RATE * 100) / 100 : 0;
    var total = books + ship + tax;

    out.innerHTML =
      '<span>Book: ' + n + ' &times; ' + money(PRICE) + ' = ' + money(books) + '</span>' +
      '<span>Shipping: ' + money(ship) + '</span>' +
      '<span>' + (isTX ? 'Texas sales tax (8.25%): ' : 'Sales tax (Texas only): ') + money(tax) + '</span>' +
      '<strong>Total: ' + money(total) + '</strong>' +
      '<em>Stripe shows the same total before you pay.</em>';
  }

  function showError(text) {
    if (!errBox) return;
    errBox.textContent = text;
    errBox.hidden = false;
  }

  function messageFor(code) {
    switch (code) {
      case 'captcha':
        return 'Please finish the verification check, then try again.';
      case 'rate_limited':
        return 'Too many attempts from this connection. Wait a minute and try again.';
      case 'bad_quantity':
        return 'Please choose between 1 and 4 copies.';
      case 'bad_email':
        return 'That email address does not look right.';
      case 'bad_address':
        return 'Please fill in your street address and city.';
      case 'bad_state':
        return 'Please use a two-letter US state code, for example TX.';
      case 'bad_zip':
        return 'Please use a five-digit ZIP code.';
      case 'bad_name':
        return 'Please tell us your name.';
      case 'checkout_failed':
        return 'The payment page could not start. Please try again, or email littleladybugpress@gmail.com.';
      default:
        return 'Something went wrong. Please try again, or email littleladybugpress@gmail.com.';
    }
  }

  qty.addEventListener('change', update);
  state.addEventListener('input', update);
  state.addEventListener('change', update);
  state.addEventListener('blur', update);
  document.addEventListener('input', update, true);
  document.addEventListener('change', update, true);
  window.addEventListener('pageshow', update);
  update();

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (errBox) errBox.hidden = true;

    if (!form.reportValidity()) return;

    var token = window.turnstile ? window.turnstile.getResponse() : '';
    if (!token) {
      showError('Please wait a moment for the verification check to finish, then try again.');
      return;
    }

    var payload = {
      qty: parseInt(qty.value, 10),
      name: document.getElementById('name').value,
      email: document.getElementById('email').value,
      street: document.getElementById('street').value,
      street2: document.getElementById('street2').value,
      city: document.getElementById('city').value,
      state: document.getElementById('state').value,
      zip: document.getElementById('zip').value,
      note: document.getElementById('note').value,
      company: document.getElementById('company').value,
      token: token
    };

    btn.disabled = true;
    btn.textContent = 'Opening secure payment…';

    try {
      var res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });

      var data = {};
      try { data = await res.json(); } catch (e) { /* non-JSON */ }

      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }

      showError(messageFor(data.error || ('http_' + res.status)));
    } catch (e) {
      showError('We could not reach the payment service. Check your connection, or email littleladybugpress@gmail.com.');
    }

    btn.disabled = false;
    btn.textContent = LABEL;
    if (window.turnstile) window.turnstile.reset();
  });
})();
