
const $ = id => document.getElementById(id);

const states = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

// These are selectable examples, not a complete legal rate schedule.
const gstRates = [0, 0.1, 0.25, 1.5, 3, 5, 6, 12, 18, 28, 40];

let products = [];
let logoData = "";
let stampData = "";

const money = value =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR"
  }).format(value || 0);

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function populateStates() {
  ["companyState", "customerState"].forEach(id => {
    const select = $(id);
    select.innerHTML = '<option value="">Select state</option>';

    states.forEach(state => {
      const option = document.createElement("option");
      option.value = state;
      option.textContent = state;
      select.appendChild(option);
    });
  });
}

function formatDate(date) {
  if (!date) return "—";
  const parts = date.split("-");
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function addProduct() {
  products.push({
    name: "",
    category: $("category").value,
    hsn: "",
    quantity: 1,
    rate: 0,
    gst: 18
  });

  renderProducts();
}

function renderProducts() {
  const body = $("productRows");
  body.innerHTML = "";

  products.forEach((product, index) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${index + 1}</td>

      <td>
        <input class="product-name"
          data-index="${index}" data-field="name"
          aria-label="Product name"
          value="${escapeHTML(product.name)}"
          placeholder="Product name">
        <small>${escapeHTML(product.category)}</small>
      </td>

      <td>
        <input class="hsn"
          data-index="${index}" data-field="hsn"
          aria-label="HSN/SAC"
          value="${escapeHTML(product.hsn)}"
          placeholder="HSN/SAC">
      </td>

      <td>
        <input type="number" min="0" step="any"
          data-index="${index}" data-field="quantity"
          aria-label="Quantity"
          value="${product.quantity}">
      </td>

      <td>
        <input type="number" min="0" step="0.01"
          data-index="${index}" data-field="rate"
          aria-label="Unit rate"
          value="${product.rate}">
      </td>

      <td id="taxable-${index}">₹0.00</td>

      <td>
        <select data-index="${index}" data-field="gst"
          aria-label="GST rate">
          ${gstRates.map(rate => `
            <option value="${rate}"
              ${Number(product.gst) === rate ? "selected" : ""}>
              ${rate}%
            </option>
          `).join("")}
        </select>
      </td>

      <td class="split-tax" id="cgst-${index}">₹0.00</td>
      <td class="split-tax" id="sgst-${index}">₹0.00</td>
      <td class="integrated-tax" id="igst-${index}">₹0.00</td>

      <td id="total-${index}">₹0.00</td>

      <td class="no-print">
        <button class="remove-product"
          data-remove="${index}" aria-label="Remove product">X</button>
      </td>
    `;

    body.appendChild(row);
  });

  body.querySelectorAll("[data-index]").forEach(input => {
    input.addEventListener("input", event => {
      const index = Number(event.target.dataset.index);
      const field = event.target.dataset.field;
      const value = event.target.value;

      if (field === "name" || field === "hsn") {
        products[index][field] = value;
      } else {
        products[index][field] = Number(value) || 0;
      }

      calculateTotals();
    });
  });

  body.querySelectorAll("[data-remove]").forEach(button => {
    button.addEventListener("click", () => {
      products.splice(Number(button.dataset.remove), 1);
      renderProducts();
    });
  });

  calculateTotals();
}

function calculateTotals() {
  const companyState = $("companyState").value;
  const customerState = $("customerState").value;

  const statesSelected = Boolean(companyState && customerState);
  const intraState = statesSelected && companyState === customerState;
  const interState = statesSelected && companyState !== customerState;

  let taxableTotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let grandTotal = 0;

  products.forEach((product, index) => {
    const quantity = Math.max(0, Number(product.quantity) || 0);
    const rate = Math.max(0, Number(product.rate) || 0);
    const gstRate = Math.max(0, Number(product.gst) || 0);

    const taxable = quantity * rate;
    const tax = taxable * gstRate / 100;

    const cgst = intraState ? tax / 2 : 0;
    const sgst = intraState ? tax / 2 : 0;
    const igst = interState ? tax : 0;

    const lineTotal = taxable + tax;

    taxableTotal += taxable;
    cgstTotal += cgst;
    sgstTotal += sgst;
    igstTotal += igst;
    grandTotal += lineTotal;

    $(`taxable-${index}`).textContent = money(taxable);
    $(`cgst-${index}`).textContent = money(cgst);
    $(`sgst-${index}`).textContent = money(sgst);
    $(`igst-${index}`).textContent = money(igst);
    $(`total-${index}`).textContent = money(lineTotal);
  });

  $("taxableTotal").textContent = money(taxableTotal);
  $("cgstTotal").textContent = money(cgstTotal);
  $("sgstTotal").textContent = money(sgstTotal);
  $("igstTotal").textContent = money(igstTotal);
  $("grandTotal").textContent = money(grandTotal);
  $("roundedTotal").textContent = money(Math.round(grandTotal));

  document.querySelectorAll(".split-tax").forEach(element => {
    element.classList.toggle("hidden", !intraState);
  });

  document.querySelectorAll(".integrated-tax").forEach(element => {
    element.classList.toggle("hidden", !interState);
  });

  $("taxType").textContent = !statesSelected
    ? "Select both states"
    : intraState
      ? "CGST + SGST"
      : "IGST";
}

function bindPreview(inputId, previewId, fallback) {
  $(inputId).addEventListener("input", () => {
    $(previewId).textContent = $(inputId).value || fallback;
  });
}

function updateInvoiceDate() {
  $("previewInvoiceDate").textContent =
    formatDate($("invoiceDate").value);
}

function loadImage(inputId, previewId, callback) {
  $(inputId).addEventListener("change", event => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Please select an image smaller than 2 MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      callback(reader.result);
      $(previewId).src = reader.result;
      $(previewId).classList.remove("hidden");
    };

    reader.readAsDataURL(file);
  });
}

function saveCompanyDetails() {
  const settings = {
    companyName: $("companyName").value,
    companyGstin: $("companyGstin").value,
    companyAddress: $("companyAddress").value,
    companyState: $("companyState").value,
    logoData,
    stampData
  };

  try {
    localStorage.setItem(
      "gstInvoiceSettings",
      JSON.stringify(settings)
    );
    alert("Company details saved in this browser.");
  } catch (error) {
    alert("Unable to save details. Try smaller logo or stamp images.");
  }
}

function loadCompanyDetails() {
  try {
    const settings = JSON.parse(
      localStorage.getItem("gstInvoiceSettings") || "null"
    );

    if (!settings) return;

    $("companyName").value = settings.companyName || "";
    $("companyGstin").value = settings.companyGstin || "";
    $("companyAddress").value = settings.companyAddress || "";
    $("companyState").value = settings.companyState || "";

    logoData = settings.logoData || "";
    stampData = settings.stampData || "";

    if (logoData) {
      $("logoPreview").src = logoData;
      $("logoPreview").classList.remove("hidden");
    }

    if (stampData) {
      $("stampPreview").src = stampData;
      $("stampPreview").classList.remove("hidden");
    }
  } catch (error) {
    console.error("Could not load company settings.");
  }
}

function initialize() {
  populateStates();

  $("invoiceDate").value =
    new Date().toLocaleDateString("en-CA");

  bindPreview("companyName", "previewCompany", "Your Company Name");
  bindPreview("companyAddress", "previewAddress", "Business address");
  bindPreview("companyGstin", "previewGstin", "Not entered");

  bindPreview("invoiceNumber", "previewInvoiceNumber", "INV-001");
  bindPreview("customerName", "previewCustomer", "Customer name");
  bindPreview(
    "customerAddress",
    "previewCustomerAddress",
    "Customer address"
  );
  bindPreview("customerGstin", "previewCustomerGstin", "—");

  $("invoiceDate").addEventListener("change", updateInvoiceDate);

  ["companyState", "customerState"].forEach(id => {
    $(id).addEventListener("change", calculateTotals);
  });

  $("notes").addEventListener("input", () => {
    $("printNotes").textContent = $("notes").value;
  });

  $("addProduct").addEventListener("click", addProduct);
  $("printInvoice").addEventListener("click", () => window.print());
  $("saveCompany").addEventListener("click", saveCompanyDetails);

  loadImage("logoFile", "logoPreview", data => logoData = data);
  loadImage("stampFile", "stampPreview", data => stampData = data);

  loadCompanyDetails();

  [
    ["companyName", "previewCompany", "Your Company Name"],
    ["companyAddress", "previewAddress", "Business address"],
    ["companyGstin", "previewGstin", "Not entered"]
  ].forEach(([input, preview, fallback]) => {
    $(preview).textContent = $(input).value || fallback;
  });

  updateInvoiceDate();
  addProduct();
}

initialize();
