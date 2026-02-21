import { useState } from "react";

const defaultPaymentDetails = {
  accountName: "TRESVANCE SOFTWARES",
  accNo: "22810200003388",
  ifsc: "FDRL0002281",
  swiftCode: "FDRLINBBIBD",
  branch: "KADAPPAKADA, KOLLAM",
};

const defaultTerms = [
  { heading: "Payment Terms", content: "50% advance upon confirmation. 50% before final deployment." },
  { heading: "Project Timeline", content: "6 – 8 working weeks from date of advance payment." },
  { heading: "Domain", content: "Not included in this quote. Client to provide their own domain." },
  { heading: "Content", content: "Client to provide required brand assets and must verify it." },
  { heading: "Post Launch Support", content: "100 days free support after launch for bug fixes." },
  { heading: "Quote Validity", content: "This quotation is valid for 30 days from the date of issue." },
];

const projectTypeOptions = ["Website Development", "ERP Software", "Mobile App Development", "Custom Software Development", "E-Commerce Platform", "Other"];

const emptyPage = () => ({ name: "", description: "", features: [""], isMainNav: false });
const emptyPriceModule = () => ({ name: "", price: "" });

export default function App() {
  const [view, setView] = useState("admin");
  const [quote, setQuote] = useState({
    clientName: "",
    clientAddress: "",
    quoteRef: "",
    date: new Date().toLocaleDateString("en-IN"),
    projectType: "Website Development",
    customProjectType: "",
    mainPagesCount: "",
    subPagesCount: "",
    mainNavItems: [""],
    pages: [emptyPage()],
    additionalFeatures: ["SSL secured website (HTTPS)", "SEO optimized page & URL structure", "Fully mobile-responsive design (all breakpoints)"],
    priceModules: [emptyPriceModule()],
    terms: defaultTerms.map(t => ({ ...t })),
    amcEnabled: true,
    amcLine: "8000 (CLOUD + SSL) + 4000 (SUPPORT) = 12,000 INR/YR",
    payment: { ...defaultPaymentDetails },
    preparedBy: "Tresvance Softwares",
  });

  const updateQuote = (field, value) => setQuote(q => ({ ...q, [field]: value }));
  const updateNested = (parent, field, value) => setQuote(q => ({ ...q, [parent]: { ...q[parent], [field]: value } }));

  // Pages
  const addPage = () => setQuote(q => ({ ...q, pages: [...q.pages, emptyPage()] }));
  const removePage = (i) => setQuote(q => ({ ...q, pages: q.pages.filter((_, idx) => idx !== i) }));
  const updatePage = (i, field, value) => setQuote(q => {
    const pages = [...q.pages];
    pages[i] = { ...pages[i], [field]: value };
    return { ...q, pages };
  });
  const addFeature = (pi) => setQuote(q => {
    const pages = [...q.pages];
    pages[pi] = { ...pages[pi], features: [...pages[pi].features, ""] };
    return { ...q, pages };
  });
  const updateFeature = (pi, fi, val) => setQuote(q => {
    const pages = [...q.pages];
    const features = [...pages[pi].features];
    features[fi] = val;
    pages[pi] = { ...pages[pi], features };
    return { ...q, pages };
  });
  const removeFeature = (pi, fi) => setQuote(q => {
    const pages = [...q.pages];
    pages[pi] = { ...pages[pi], features: pages[pi].features.filter((_, i) => i !== fi) };
    return { ...q, pages };
  });

  // Nav items
  const addNavItem = () => setQuote(q => ({ ...q, mainNavItems: [...q.mainNavItems, ""] }));
  const updateNavItem = (i, val) => setQuote(q => {
    const items = [...q.mainNavItems];
    items[i] = val;
    return { ...q, mainNavItems: items };
  });
  const removeNavItem = (i) => setQuote(q => ({ ...q, mainNavItems: q.mainNavItems.filter((_, idx) => idx !== i) }));

  // Additional features
  const addAdditionalFeature = () => setQuote(q => ({ ...q, additionalFeatures: [...q.additionalFeatures, ""] }));
  const updateAdditionalFeature = (i, val) => setQuote(q => {
    const f = [...q.additionalFeatures];
    f[i] = val;
    return { ...q, additionalFeatures: f };
  });
  const removeAdditionalFeature = (i) => setQuote(q => ({ ...q, additionalFeatures: q.additionalFeatures.filter((_, idx) => idx !== i) }));

  // Price modules
  const addPriceModule = () => setQuote(q => ({ ...q, priceModules: [...q.priceModules, emptyPriceModule()] }));
  const removePriceModule = (i) => setQuote(q => ({ ...q, priceModules: q.priceModules.filter((_, idx) => idx !== i) }));
  const updatePriceModule = (i, field, val) => setQuote(q => {
    const m = [...q.priceModules];
    m[i] = { ...m[i], [field]: val };
    return { ...q, priceModules: m };
  });

  // Terms
  const addTerm = () => setQuote(q => ({ ...q, terms: [...q.terms, { heading: "", content: "" }] }));
  const removeTerm = (i) => setQuote(q => ({ ...q, terms: q.terms.filter((_, idx) => idx !== i) }));
  const updateTerm = (i, field, val) => setQuote(q => {
    const terms = [...q.terms];
    terms[i] = { ...terms[i], [field]: val };
    return { ...q, terms };
  });

  const projectLabel = quote.projectType === "Other" ? quote.customProjectType : quote.projectType;
  const totalPrice = quote.priceModules.reduce((sum, m) => sum + (parseFloat(m.price) || 0), 0);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', background: "#f5f3ee", minHeight: "100vh" }}>
      <div style={{ background: "#1a2744", color: "white", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "Arial, sans-serif", fontWeight: "bold", fontSize: 20, letterSpacing: 2, color: "#c9a84c" }}>TRESVANCE SOFTWARES</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>Quotation Generator</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setView("admin")} style={tabBtn(view === "admin")}>⚙ Admin Panel</button>
          <button onClick={() => setView("preview")} style={tabBtn(view === "preview")}>👁 Preview Quote</button>
          {view === "preview" && (
            <button onClick={() => {
              const content = document.getElementById("print-root");
              if (!content) return;
              const win = window.open("", "_blank", "width=900,height=700");
              win.document.write(`<!DOCTYPE html><html><head><title>Quote</title><style>
                @page { margin: 0; size: A4; }
                body { margin: 0; font-family: Arial, sans-serif; font-weight: bold; background: white; }
                * { box-sizing: border-box; }
              </style></head><body>${content.innerHTML}</body></html>`);
              win.document.close();
              win.focus();
              setTimeout(() => { win.print(); win.close(); }, 500);
            }} style={{ ...tabBtn(false), background: "#c9a84c", color: "#1a2744", fontWeight: "bold" }}>🖨 Print / Save PDF</button>
          )}
        </div>
      </div>

      {view === "admin" ? (
        <AdminPanel
          quote={quote} updateQuote={updateQuote} updateNested={updateNested}
          addPage={addPage} removePage={removePage} updatePage={updatePage}
          addFeature={addFeature} updateFeature={updateFeature} removeFeature={removeFeature}
          addNavItem={addNavItem} updateNavItem={updateNavItem} removeNavItem={removeNavItem}
          addAdditionalFeature={addAdditionalFeature} updateAdditionalFeature={updateAdditionalFeature} removeAdditionalFeature={removeAdditionalFeature}
          addPriceModule={addPriceModule} removePriceModule={removePriceModule} updatePriceModule={updatePriceModule}
          addTerm={addTerm} removeTerm={removeTerm} updateTerm={updateTerm}
          projectTypeOptions={projectTypeOptions} totalPrice={totalPrice}
        />
      ) : (
        <QuotePreview quote={quote} projectLabel={projectLabel} totalPrice={totalPrice} />
      )}
    </div>
  );
}

function tabBtn(active) {
  return {
    padding: "8px 16px", borderRadius: 6, border: "none", cursor: "pointer",
    background: active ? "#c9a84c" : "rgba(255,255,255,0.15)",
    color: active ? "#1a2744" : "white", fontWeight: active ? "bold" : "normal", fontSize: 13,
  };
}

function AdminPanel(props) {
  const { quote, updateQuote, updateNested, addPage, removePage, updatePage, addFeature, updateFeature, removeFeature,
    addNavItem, updateNavItem, removeNavItem, addAdditionalFeature, updateAdditionalFeature, removeAdditionalFeature,
    addPriceModule, removePriceModule, updatePriceModule, addTerm, removeTerm, updateTerm, projectTypeOptions, totalPrice } = props;

  const [section, setSection] = useState("client");
  const sections = [
    { id: "client", label: "📋 Client Info" },
    { id: "pages", label: "📄 Pages & Features" },
    { id: "additional", label: "⚙ Additional Features" },
    { id: "pricing", label: "💰 Pricing" },
    { id: "terms", label: "📜 Terms & Conditions" },
    { id: "payment", label: "💳 Payment Details" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
      <div style={{ width: 210, background: "#1a2744", padding: "24px 0", flexShrink: 0 }}>
        {sections.map(s => (
          <div key={s.id} onClick={() => setSection(s.id)}
            style={{ padding: "12px 20px", cursor: "pointer", color: section === s.id ? "#c9a84c" : "#aaa",
              borderLeft: section === s.id ? "3px solid #c9a84c" : "3px solid transparent",
              background: section === s.id ? "rgba(201,168,76,0.1)" : "transparent", fontSize: 13 }}>
            {s.label}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, padding: 32, overflowY: "auto" }}>
        {section === "client" && <ClientSection quote={quote} updateQuote={updateQuote} updateNested={updateNested} addNavItem={addNavItem} updateNavItem={updateNavItem} removeNavItem={removeNavItem} projectTypeOptions={projectTypeOptions} />}
        {section === "pages" && <PagesSection quote={quote} addPage={addPage} removePage={removePage} updatePage={updatePage} addFeature={addFeature} updateFeature={updateFeature} removeFeature={removeFeature} />}
        {section === "additional" && <AdditionalFeaturesSection quote={quote} addAdditionalFeature={addAdditionalFeature} updateAdditionalFeature={updateAdditionalFeature} removeAdditionalFeature={removeAdditionalFeature} />}
        {section === "pricing" && <PricingSection quote={quote} addPriceModule={addPriceModule} removePriceModule={removePriceModule} updatePriceModule={updatePriceModule} totalPrice={totalPrice} />}
        {section === "terms" && <TermsSection quote={quote} updateQuote={updateQuote} addTerm={addTerm} removeTerm={removeTerm} updateTerm={updateTerm} />}
        {section === "payment" && <PaymentSection quote={quote} updateNested={updateNested} />}
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 style={{ color: "#1a2744", borderBottom: "2px solid #c9a84c", paddingBottom: 8, marginBottom: 24, fontFamily: "Arial, sans-serif" }}>{children}</h2>;
}
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: "bold", color: "#555", marginBottom: 4, fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>
      {children}
    </div>
  );
}
const inp = { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 6, fontSize: 14, fontFamily: "Arial, sans-serif", boxSizing: "border-box", outline: "none" };

function ClientSection({ quote, updateQuote, updateNested, addNavItem, updateNavItem, removeNavItem, projectTypeOptions }) {
  return (
    <div>
      <SectionTitle>Client Information</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Client / Company Name">
          <input style={inp} value={quote.clientName} onChange={e => updateQuote("clientName", e.target.value)} placeholder="e.g. Venad Finances and Business Enterprises Pvt Ltd." />
        </Field>
        <Field label="Quote Reference">
          <input style={inp} value={quote.quoteRef} onChange={e => updateQuote("quoteRef", e.target.value)} placeholder="e.g. VENADFIN_QUOTE_26" />
        </Field>
        <Field label="Client Address">
          <input style={inp} value={quote.clientAddress} onChange={e => updateQuote("clientAddress", e.target.value)} placeholder="Client address (optional)" />
        </Field>
        <Field label="Date">
          <input style={inp} value={quote.date} onChange={e => updateQuote("date", e.target.value)} />
        </Field>
        <Field label="Project Type">
          <select style={inp} value={quote.projectType} onChange={e => updateQuote("projectType", e.target.value)}>
            {projectTypeOptions.map(p => <option key={p}>{p}</option>)}
          </select>
        </Field>
        {quote.projectType === "Other" && (
          <Field label="Custom Project Type">
            <input style={inp} value={quote.customProjectType} onChange={e => updateQuote("customProjectType", e.target.value)} placeholder="Enter project type" />
          </Field>
        )}
        <Field label="Prepared By">
          <input style={inp} value={quote.preparedBy} onChange={e => updateQuote("preparedBy", e.target.value)} />
        </Field>
      </div>

      <div style={{ marginTop: 24, borderTop: "1px solid #eee", paddingTop: 20 }}>
        <SectionTitle>Page Count (for Scope Table)</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 500 }}>
          <Field label="Main Pages Count">
            <input style={inp} type="number" value={quote.mainPagesCount} onChange={e => updateQuote("mainPagesCount", e.target.value)} placeholder="e.g. 9" />
          </Field>
          <Field label="Sub Pages Count">
            <input style={inp} type="number" value={quote.subPagesCount} onChange={e => updateQuote("subPagesCount", e.target.value)} placeholder="e.g. 32" />
          </Field>
        </div>
      </div>

      <div style={{ marginTop: 24, borderTop: "1px solid #eee", paddingTop: 20 }}>
        <SectionTitle>Main Navigation Menu Items</SectionTitle>
        <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>These appear as the bullet list under section 2.1 in the quote.</p>
        {quote.mainNavItems.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input style={{ ...inp, flex: 1 }} value={item} onChange={e => updateNavItem(i, e.target.value)} placeholder={`Nav item ${i + 1}`} />
            {quote.mainNavItems.length > 1 && (
              <button onClick={() => removeNavItem(i)} style={{ background: "#fee", border: "1px solid #fcc", color: "#c00", borderRadius: 4, padding: "4px 8px", cursor: "pointer" }}>✕</button>
            )}
          </div>
        ))}
        <button onClick={addNavItem} style={{ background: "transparent", border: "1px dashed #c9a84c", color: "#c9a84c", borderRadius: 4, padding: "6px 12px", cursor: "pointer", fontSize: 12 }}>+ Add Nav Item</button>
      </div>
    </div>
  );
}

function PagesSection({ quote, addPage, removePage, updatePage, addFeature, updateFeature, removeFeature }) {
  return (
    <div>
      <SectionTitle>Pages & Features</SectionTitle>
      <div style={{ marginBottom: 8, color: "#666", fontSize: 13 }}>These appear as subsections 2.2, 2.3, etc. in the quote. <strong>{quote.pages.length} page(s)</strong> defined.</div>
      {quote.pages.map((page, pi) => (
        <div key={pi} style={{ background: "white", border: "1px solid #e0ddd5", borderRadius: 8, padding: 20, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontWeight: "bold", color: "#1a2744", fontSize: 15 }}>Section 2.{pi + 2}</div>
            {quote.pages.length > 1 && (
              <button onClick={() => removePage(pi)} style={{ background: "#fee", border: "1px solid #fcc", color: "#c00", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>✕ Remove</button>
            )}
          </div>
          <Field label="Page / Section Name">
            <input style={inp} value={page.name} onChange={e => updatePage(pi, "name", e.target.value)} placeholder="e.g. Home Page, About Us, Products & Services" />
          </Field>
          <Field label="Intro Paragraph (optional)">
            <textarea style={{ ...inp, minHeight: 70, resize: "vertical" }} value={page.description} onChange={e => updatePage(pi, "description", e.target.value)} placeholder="Brief paragraph describing this section..." />
          </Field>
          <div style={{ marginBottom: 4 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: "bold", color: "#555", marginBottom: 6, fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: 0.5 }}>Key Features / Sub-items</label>
            {page.features.map((feat, fi) => (
              <div key={fi} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <input style={{ ...inp, flex: 1 }} value={feat} onChange={e => updateFeature(pi, fi, e.target.value)} placeholder={`Feature ${fi + 1}`} />
                {page.features.length > 1 && (
                  <button onClick={() => removeFeature(pi, fi)} style={{ background: "#fee", border: "1px solid #fcc", color: "#c00", borderRadius: 4, padding: "4px 8px", cursor: "pointer" }}>✕</button>
                )}
              </div>
            ))}
            <button onClick={() => addFeature(pi)} style={{ background: "transparent", border: "1px dashed #c9a84c", color: "#c9a84c", borderRadius: 4, padding: "6px 12px", cursor: "pointer", fontSize: 12, marginTop: 4 }}>+ Add Feature</button>
          </div>
        </div>
      ))}
      <button onClick={addPage} style={{ background: "#1a2744", color: "white", border: "none", borderRadius: 6, padding: "12px 24px", cursor: "pointer", fontSize: 14 }}>+ Add Page / Section</button>
    </div>
  );
}

function AdditionalFeaturesSection({ quote, addAdditionalFeature, updateAdditionalFeature, removeAdditionalFeature }) {
  return (
    <div>
      <SectionTitle>Additional Features & Technical Enhancements</SectionTitle>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>These appear under Section 3 of the quote.</p>
      {quote.additionalFeatures.map((feat, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input style={{ ...inp, flex: 1 }} value={feat} onChange={e => updateAdditionalFeature(i, e.target.value)} placeholder="e.g. SSL secured website (HTTPS)" />
          {quote.additionalFeatures.length > 1 && (
            <button onClick={() => removeAdditionalFeature(i)} style={{ background: "#fee", border: "1px solid #fcc", color: "#c00", borderRadius: 4, padding: "4px 8px", cursor: "pointer" }}>✕</button>
          )}
        </div>
      ))}
      <button onClick={addAdditionalFeature} style={{ background: "transparent", border: "1px dashed #c9a84c", color: "#c9a84c", borderRadius: 4, padding: "6px 12px", cursor: "pointer", fontSize: 12 }}>+ Add Feature</button>
    </div>
  );
}

function PricingSection({ quote, addPriceModule, removePriceModule, updatePriceModule, totalPrice }) {
  const toWords = (n) => {
    if (!n) return "";
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
      "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + toWords(n % 100) : "");
    if (n < 100000) return toWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + toWords(n % 1000) : "");
    if (n < 10000000) return toWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + toWords(n % 100000) : "");
    return toWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + toWords(n % 10000000) : "");
  };

  return (
    <div>
      <SectionTitle>Detailed Pricing Breakdown</SectionTitle>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>Add each module and its price. This appears as Section 4 in the quote.</p>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: 40 }}>Sl</th>
            <th style={thStyle}>Module / Item</th>
            <th style={{ ...thStyle, width: 160 }}>Price (₹)</th>
            <th style={{ ...thStyle, width: 50 }}></th>
          </tr>
        </thead>
        <tbody>
          {quote.priceModules.map((m, i) => (
            <tr key={i}>
              <td style={{ ...tdStyle, textAlign: "center" }}>{String(i + 1).padStart(2, "0")}</td>
              <td style={tdStyle}>
                <input style={{ ...inp, border: "none", background: "transparent", padding: "4px 0" }} value={m.name} onChange={e => updatePriceModule(i, "name", e.target.value)} placeholder="e.g. UI/UX Design" />
              </td>
              <td style={tdStyle}>
                <input style={{ ...inp, border: "none", background: "transparent", padding: "4px 0" }} type="number" value={m.price} onChange={e => updatePriceModule(i, "price", e.target.value)} placeholder="e.g. 15000" />
              </td>
              <td style={{ ...tdStyle, textAlign: "center" }}>
                {quote.priceModules.length > 1 && (
                  <button onClick={() => removePriceModule(i)} style={{ background: "#fee", border: "1px solid #fcc", color: "#c00", borderRadius: 4, padding: "2px 6px", cursor: "pointer", fontSize: 11 }}>✕</button>
                )}
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={2} style={{ padding: "10px 14px", fontWeight: "bold", fontFamily: "Arial, sans-serif", background: "#1a2744", color: "#c9a84c", textAlign: "right" }}>TOTAL PROJECT COST</td>
            <td colSpan={2} style={{ padding: "10px 14px", fontWeight: "bold", fontFamily: "Arial, sans-serif", background: "#1a2744", color: "#c9a84c" }}>₹ {totalPrice.toLocaleString("en-IN")}</td>
          </tr>
        </tbody>
      </table>
      <button onClick={addPriceModule} style={{ background: "#1a2744", color: "white", border: "none", borderRadius: 6, padding: "10px 20px", cursor: "pointer", fontSize: 13, marginBottom: 12 }}>+ Add Module</button>
      {totalPrice > 0 && (
        <div style={{ background: "#f0f8e8", border: "1px solid #b8d9a0", borderRadius: 6, padding: 12, fontSize: 13, color: "#4a7a30", marginTop: 8 }}>
          In words: <strong>₹ {totalPrice.toLocaleString("en-IN")} ({toWords(totalPrice)} Rupees Only)</strong>
        </div>
      )}
    </div>
  );
}

function TermsSection({ quote, updateQuote, addTerm, removeTerm, updateTerm }) {
  return (
    <div>
      <SectionTitle>Terms & Conditions</SectionTitle>
      {quote.terms.map((term, i) => (
        <div key={i} style={{ background: "white", border: "1px solid #e0ddd5", borderRadius: 8, padding: 16, marginBottom: 12, display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Field label="Heading">
              <input style={inp} value={term.heading} onChange={e => updateTerm(i, "heading", e.target.value)} placeholder="e.g. Payment Terms" />
            </Field>
            <Field label="Content">
              <textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} value={term.content} onChange={e => updateTerm(i, "content", e.target.value)} />
            </Field>
          </div>
          <button onClick={() => removeTerm(i)} style={{ background: "#fee", border: "1px solid #fcc", color: "#c00", borderRadius: 4, padding: "4px 8px", cursor: "pointer", height: "fit-content", marginTop: 20 }}>✕</button>
        </div>
      ))}

      <div style={{ background: "white", border: "1px solid #e0ddd5", borderRadius: 8, padding: 16, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <label style={{ fontWeight: "bold", fontFamily: "Arial, sans-serif", fontSize: 13, color: "#1a2744" }}>AMC Charge Line</label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={quote.amcEnabled} onChange={e => updateQuote("amcEnabled", e.target.checked)} />
            Include AMC in Terms
          </label>
        </div>
        {quote.amcEnabled && (
          <Field label="AMC Content">
            <input style={inp} value={quote.amcLine} onChange={e => updateQuote("amcLine", e.target.value)} placeholder="e.g. 8000 (CLOUD+SSL) + 4000(SUPPORT) = 12,000 INR/YR" />
          </Field>
        )}
      </div>

      <button onClick={addTerm} style={{ background: "#1a2744", color: "white", border: "none", borderRadius: 6, padding: "12px 24px", cursor: "pointer", fontSize: 14 }}>+ Add Term</button>
    </div>
  );
}

function PaymentSection({ quote, updateNested }) {
  const fields = [["accountName", "Account Name"], ["accNo", "Account Number"], ["ifsc", "IFSC Code"], ["swiftCode", "SWIFT Code"], ["branch", "Branch"]];
  return (
    <div>
      <SectionTitle>Payment Details</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {fields.map(([key, label]) => (
          <Field key={key} label={label}>
            <input style={inp} value={quote.payment[key]} onChange={e => updateNested("payment", key, e.target.value)} />
          </Field>
        ))}
      </div>
    </div>
  );
}

// ─── PREVIEW ─────────────────────────────────────────────────────────────────

function QuotePreview({ quote, projectLabel, totalPrice }) {
  const toWords = (n) => {
    if (!n) return "";
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
      "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + toWords(n % 100) : "");
    if (n < 100000) return toWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + toWords(n % 1000) : "");
    if (n < 10000000) return toWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + toWords(n % 100000) : "");
    return toWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + toWords(n % 10000000) : "");
  };

  const mainPages = parseInt(quote.mainPagesCount) || 0;
  const subPages = parseInt(quote.subPagesCount) || 0;
  const totalPages = mainPages + subPages;

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 0; size: A4; }
          body { margin: 0 !important; }
          .no-print { display: none !important; }
          .print-page { box-shadow: none !important; margin: 0 !important; }
        }
      `}</style>

      <div className="no-print" style={{ background: "#e8e4db", padding: "12px 32px", fontSize: 13, color: "#666", borderBottom: "1px solid #d0ccc3" }}>
        📄 Preview — Click <strong>Print / Save PDF</strong> in the header to export
      </div>

      <div id="print-root" style={{ maxWidth: 860, margin: "0 auto", padding: "32px 16px" }}>
        <div className="print-page" style={{ background: "white", boxShadow: "0 4px 40px rgba(0,0,0,0.12)" }}>

          {/* ── Cover Page ── */}
          <div style={{ minHeight: 297 * 3.78, display: "flex", flexDirection: "column", position: "relative" }}>
            <div style={{ background: "#1a2744", color: "white", padding: "14px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "Arial, sans-serif", fontWeight: "bold", fontSize: 15, letterSpacing: 2, color: "#c9a84c" }}>TRESVANCE SOFTWARES</span>
              <span style={{ fontSize: 11, opacity: 0.6, fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}>Souparnika Building, Priyadarsini Nagar 128, Kilikolloor P.O, Kollam 691500</span>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 40px" }}>
              <div style={{ width: "80%", height: 3, background: "linear-gradient(90deg, #1a2744, #c9a84c, #1a2744)", marginBottom: 48 }} />
              <div style={{ fontFamily: "Arial, sans-serif", fontWeight: "bold", fontSize: 32, color: "#1a2744", letterSpacing: 3, textAlign: "center", marginBottom: 8 }}>TRESVANCE SOFTWARES</div>
              <div style={{ width: 60, height: 2, background: "#c9a84c", margin: "16px auto 32px" }} />
              <div style={{ fontFamily: "Arial, sans-serif", fontWeight: "bold", fontSize: 26, color: "#1a2744", textAlign: "center", marginBottom: 8 }}>{projectLabel.toUpperCase()}</div>
              <div style={{ fontFamily: "Arial, sans-serif", fontWeight: "bold", fontSize: 22, color: "#c9a84c", textAlign: "center", marginBottom: 48 }}>QUOTATION</div>
              <div style={{ fontSize: 15, color: "#444", marginBottom: 6 }}>Prepared for</div>
              <div style={{ fontFamily: "Arial, sans-serif", fontWeight: "bold", fontSize: 19, color: "#1a2744", textAlign: "center" }}>{quote.clientName || "Client Name"}</div>
              {quote.clientAddress && <div style={{ fontSize: 13, color: "#666", textAlign: "center", marginTop: 6 }}>{quote.clientAddress}</div>}
              <div style={{ width: "80%", height: 3, background: "linear-gradient(90deg, #1a2744, #c9a84c, #1a2744)", margin: "48px 0 40px" }} />

              <table style={{ width: "60%", borderCollapse: "collapse", fontSize: 13 }}>
                {[
                  ["Prepared For", quote.clientName || "—"],
                  ["Prepared By", quote.preparedBy],
                  ["Quote Reference", quote.quoteRef || "—"],
                  ["Date", quote.date],
                  ["Currency", "INR (Indian Rupees)"],
                  ["Project Type", projectLabel],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ padding: "7px 14px", background: "#1a2744", color: "#c9a84c", fontWeight: "bold", fontFamily: "Arial, sans-serif", width: "40%" }}>{k}</td>
                    <td style={{ padding: "7px 14px", background: "#f7f5f0", color: "#333", fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}>{v}</td>
                  </tr>
                ))}
              </table>
            </div>

            <div style={{ borderTop: "3px solid #1a2744", padding: "10px 40px", display: "flex", justifyContent: "space-between", fontSize: 11, color: "#888" }}>
              <span style={{fontFamily:'Arial,sans-serif',fontWeight:'bold'}}>www.tresvance.com</span><span style={{fontFamily:'Arial,sans-serif',fontWeight:'bold'}}>info@tresvance.com</span><span style={{fontFamily:'Arial,sans-serif',fontWeight:'bold'}}>+91 8129108139</span>
            </div>
          </div>

          <div style={{ borderTop: "3px solid #1a2744" }} />

          {/* ── Content ── */}
          <div style={{ padding: "40px 48px" }}>

            {/* 1. Project Overview */}
            <Section num="1" title="PROJECT OVERVIEW">
              <p style={bodyText}>We are pleased to present this detailed commercial quotation for the design and development of a comprehensive <strong>{projectLabel.toLowerCase()}</strong> for <strong>{quote.clientName || "[Client Name]"}</strong>. This proposal covers all pages, module, and technical features required to establish a professional, secure and user-friendly digital presence befitting a leading organisation.</p>
            </Section>

            {/* 2. Scope */}
            <Section num="2" title="WEBSITE STRUCTURE & SCOPE">
              {quote.pages.map((page, pi) => (
                page.name && (
                  <div key={pi} style={{ marginBottom: 24 }}>
                    <div style={{ fontFamily: "Arial, sans-serif", fontWeight: "bold", color: "#1a2744", fontSize: 14, marginBottom: 6 }}>
                      {page.name}
                      {page.description ? <span style={{ fontWeight: 'bold', fontFamily: 'Arial, sans-serif' }}> — {page.description}</span> : ""}
                    </div>
                    {page.features.filter(f => f.trim()).length > 0 && (
                      <ul style={{ margin: "4px 0 0 0", paddingLeft: 20 }}>
                        {page.features.filter(f => f.trim()).map((f, fi) => (
                          <li key={fi} style={{ fontSize: 13, color: "#444", marginBottom: 4, lineHeight: 1.6, fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}>{f}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              ))}
            </Section>

            {/* 3. Additional Features */}
            {quote.additionalFeatures.filter(f => f.trim()).length > 0 && (
              <Section num="3" title="ADDITIONAL FEATURES & TECHNICAL ENHANCEMENTS">
                <div style={{ fontFamily: "Arial, sans-serif", fontWeight: "bold", color: "#1a2744", fontSize: 13, marginBottom: 8 }}>3.1 Additional Features</div>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {quote.additionalFeatures.filter(f => f.trim()).map((f, i) => (
                    <li key={i} style={{ fontSize: 13, color: "#444", marginBottom: 4, lineHeight: 1.6, fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}>{f}</li>
                  ))}
                </ul>
              </Section>
            )}

            {/* 4. Pricing */}
            {quote.priceModules.some(m => m.name) && (
              <Section num="4" title="DETAILED PRICING BREAKDOWN">
                <p style={bodyText}>The following table provides a module-wise cost breakdown for the complete website development project:</p>
                <table style={{ width: "60%", borderCollapse: "collapse", marginTop: 8, marginBottom: 12, fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: 40 }}>sl</th>
                      <th style={thStyle}>Module</th>
                      <th style={thStyle}>Price (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.priceModules.filter(m => m.name).map((m, i) => (
                      <tr key={i}>
                        <td style={{ ...tdStyle, textAlign: "center" }}>{String(i + 1).padStart(2, "0")}</td>
                        <td style={tdStyle}>{m.name}</td>
                        <td style={tdStyle}>{m.price ? Number(m.price).toLocaleString("en-IN") : "—"}</td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={2} style={{ padding: "8px 14px", background: "#1a2744", color: "#c9a84c", fontWeight: "bold", fontFamily: "Arial, sans-serif", textAlign: "right" }}>TOTAL PROJECT COST</td>
                      <td style={{ padding: "8px 14px", background: "#1a2744", color: "#c9a84c", fontWeight: "bold", fontFamily: "Arial, sans-serif" }}>₹ {totalPrice.toLocaleString("en-IN")}</td>
                    </tr>
                  </tbody>
                </table>
                <p style={{ ...bodyText, fontWeight: "bold" }}>
                  Total Amount: ₹ {totalPrice.toLocaleString("en-IN")} ({toWords(totalPrice)} Rupees Only)
                </p>
              </Section>
            )}

            {/* 5. Terms */}
            <Section num="5" title="TERMS & CONDITIONS">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <tbody>
                  {quote.terms.filter(t => t.heading).map((term, i) => (
                    <tr key={i}>
                      <td style={{ padding: "8px 14px", background: "#f7f5f0", fontWeight: "bold", color: "#1a2744", fontFamily: "Arial, sans-serif", width: "22%", verticalAlign: "top", borderBottom: "1px solid #e8e4db" }}>{term.heading}</td>
                      <td style={{ padding: "8px 14px", color: "#444", borderBottom: "1px solid #e8e4db", lineHeight: 1.6, fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}>{term.content}</td>
                    </tr>
                  ))}
                  {quote.amcEnabled && quote.amcLine && (
                    <tr>
                      <td style={{ padding: "8px 14px", background: "#f7f5f0", fontWeight: "bold", color: "#1a2744", fontFamily: "Arial, sans-serif", verticalAlign: "top", borderBottom: "1px solid #e8e4db" }}>AMC CHARGE</td>
                      <td style={{ padding: "8px 14px", color: "#444", borderBottom: "1px solid #e8e4db", lineHeight: 1.6, fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}>{quote.amcLine}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Section>

            {/* 6. Why Tresvance */}
            <Section num="6" title="WHY TRESVANCE SOFTWARES?">
              {[
                "Deep understanding of regulatory requirements for software developments.",
                "Strong UI/UX expertise with modern, conversion-driven design.",
                "End-to-end capabilities: design, development, integrations and deployment.",
                "Dedicated project management with clear milestone based delivery.",
                "Transparent communication and proactive status reporting throughout the project.",
                "Post launch support and training to ensure smooth handover.",
              ].map((point, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                  <span style={{ color: "#c9a84c", fontWeight: "bold", minWidth: 16 }}>•</span>
                  <span style={{ fontSize: 13, color: "#444", lineHeight: 1.6, fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}>{point}</span>
                </div>
              ))}
            </Section>

            {/* 7. Payment Details */}
            <Section num="7" title="PAYMENT DETAILS">
              <table style={{ borderCollapse: "collapse", fontSize: 13, marginTop: 8 }}>
                {[
                  ["ACCOUNT NAME", quote.payment.accountName],
                  ["ACC NO", quote.payment.accNo],
                  ["IFSC", quote.payment.ifsc],
                  ["SWIFT CODE", quote.payment.swiftCode],
                  ["BRANCH", quote.payment.branch],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ padding: "5px 16px 5px 0", fontWeight: "bold", color: "#1a2744", fontFamily: "Arial, sans-serif", whiteSpace: "nowrap" }}>{k}</td>
                    <td style={{ padding: "5px 0", color: "#333", fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}>: &nbsp;{v}</td>
                  </tr>
                ))}
              </table>
            </Section>

            {/* Closing */}
            <div style={{ marginTop: 40, padding: "24px 0", borderTop: "2px solid #1a2744", textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "#444", marginBottom: 16, fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}>
                Thank you for the opportunity to serve <strong>{quote.clientName || "[Client Name]"}</strong>.<br />
                We look forward to building a world class digital platform for your financial services and business.
              </p>
              <div style={{ fontFamily: "Arial, sans-serif", fontWeight: "bold", color: "#1a2744", fontSize: 15, marginBottom: 4 }}>{quote.preparedBy}</div>
              <div style={{ fontSize: 12, color: "#888", fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}>www.tresvance.com | info@tresvance.com | +91 8129108139</div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

function Section({ num, title, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontFamily: "Arial, sans-serif", fontWeight: "bold", fontSize: 15, color: "#1a2744", borderBottom: "2px solid #c9a84c", paddingBottom: 6, marginBottom: 14 }}>
        {num}. {title}
      </div>
      {children}
    </div>
  );
}

const bodyText = { fontSize: 13, color: "#444", lineHeight: 1.7, margin: "0 0 10px 0", fontFamily: 'Arial, sans-serif', fontWeight: 'bold' };
const thStyle = { padding: "8px 14px", background: "#1a2744", color: "#c9a84c", fontFamily: "Arial, sans-serif", textAlign: "left", fontSize: 12 };
const tdStyle = { padding: "7px 14px", background: "#f7f5f0", fontSize: 13, borderBottom: "1px solid #e8e4db", fontFamily: 'Arial, sans-serif', fontWeight: 'bold' };