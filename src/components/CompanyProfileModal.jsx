import React, { useState, useEffect } from 'react';
import { X, Building2, User, Mail, Phone, MapPin, Hash, CreditCard, DollarSign, Save, Loader2, Check } from 'lucide-react';
import { upsertUserProfile } from '../lib/supabaseClient';

export default function CompanyProfileModal({
  isOpen,
  onClose,
  user,
  currentProfile,
  onProfileUpdated,
  onApplyToInvoice,
  showToast,
}) {
  const [formData, setFormData] = useState({
    companyName: '',
    companyDescription: '',
    yourName: '',
    companyAddress: '',
    companyEmail: '',
    companyPhone: '',
    taxId: '',
    paymentDetails: '',
    defaultCurrency: 'USD',
    defaultNotes: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [applyToCurrent, setApplyToCurrent] = useState(true);

  useEffect(() => {
    if (currentProfile) {
      setFormData({
        companyName: currentProfile.company_name || currentProfile.companyName || '',
        companyDescription: currentProfile.company_description || currentProfile.companyDescription || '',
        yourName: currentProfile.your_name || currentProfile.yourName || '',
        companyAddress: currentProfile.company_address || currentProfile.companyAddress || '',
        companyEmail: currentProfile.company_email || currentProfile.companyEmail || user?.email || '',
        companyPhone: currentProfile.company_phone || currentProfile.companyPhone || '',
        taxId: currentProfile.tax_id || currentProfile.taxId || '',
        paymentDetails: currentProfile.payment_details || currentProfile.paymentDetails || '',
        defaultCurrency: currentProfile.default_currency || currentProfile.defaultCurrency || 'USD',
        defaultNotes: currentProfile.default_notes || currentProfile.defaultNotes || '',
      });
    } else if (user) {
      setFormData(prev => ({
        ...prev,
        companyEmail: user.email || '',
      }));
    }
  }, [currentProfile, user, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) {
      showToast('Please sign in to save your company profile to the cloud.', 'danger');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await upsertUserProfile(user.id, formData);
      showToast('Company profile saved to your account! Future invoices will auto-fill these details.', 'success');
      
      if (onProfileUpdated) {
        onProfileUpdated(updated);
      }

      if (applyToCurrent && onApplyToInvoice) {
        onApplyToInvoice(formData);
      }

      onClose();
    } catch (err) {
      console.error('Error saving profile:', err);
      showToast(err.message || 'Failed to save company profile.', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card profile-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="auth-header-title">
            <div className="auth-icon-badge">
              <Building2 size={20} className="text-primary" />
            </div>
            <div>
              <h3>Company Profile Settings</h3>
              <p className="modal-subtitle">
                Saved details automatically populate every new invoice you create.
              </p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="profile-form">
          <div className="profile-form-grid">
            {/* Company Name */}
            <div className="input-group">
              <label className="input-label" htmlFor="prof-company-name">
                <Building2 size={15} /> Company / Business Name
              </label>
              <input
                id="prof-company-name"
                type="text"
                className="input-field"
                placeholder="e.g. Acme Studio LLC"
                value={formData.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                required
              />
            </div>

            {/* Tagline / Subtitle */}
            <div className="input-group">
              <label className="input-label" htmlFor="prof-company-desc">
                Business Tagline / Profession
              </label>
              <input
                id="prof-company-desc"
                type="text"
                className="input-field"
                placeholder="e.g. Digital Design & Development"
                value={formData.companyDescription}
                onChange={(e) => handleChange('companyDescription', e.target.value)}
              />
            </div>

            {/* Your Name */}
            <div className="input-group">
              <label className="input-label" htmlFor="prof-your-name">
                <User size={15} /> Contact Person / Your Name
              </label>
              <input
                id="prof-your-name"
                type="text"
                className="input-field"
                placeholder="e.g. John Doe"
                value={formData.yourName}
                onChange={(e) => handleChange('yourName', e.target.value)}
              />
            </div>

            {/* Company Email */}
            <div className="input-group">
              <label className="input-label" htmlFor="prof-company-email">
                <Mail size={15} /> Billing Email
              </label>
              <input
                id="prof-company-email"
                type="email"
                className="input-field"
                placeholder="billing@acmestudio.com"
                value={formData.companyEmail}
                onChange={(e) => handleChange('companyEmail', e.target.value)}
              />
            </div>

            {/* Company Phone */}
            <div className="input-group">
              <label className="input-label" htmlFor="prof-company-phone">
                <Phone size={15} /> Phone Number
              </label>
              <input
                id="prof-company-phone"
                type="text"
                className="input-field"
                placeholder="+1 (555) 019-2834"
                value={formData.companyPhone}
                onChange={(e) => handleChange('companyPhone', e.target.value)}
              />
            </div>

            {/* Tax ID / GSTIN / VAT */}
            <div className="input-group">
              <label className="input-label" htmlFor="prof-tax-id">
                <Hash size={15} /> Tax ID / VAT / GSTIN / EIN
              </label>
              <input
                id="prof-tax-id"
                type="text"
                className="input-field"
                placeholder="e.g. VAT12345678 or GSTIN-..."
                value={formData.taxId}
                onChange={(e) => handleChange('taxId', e.target.value)}
              />
            </div>

            {/* Default Currency */}
            <div className="input-group">
              <label className="input-label" htmlFor="prof-currency">
                <DollarSign size={15} /> Default Currency
              </label>
              <select
                id="prof-currency"
                className="input-field"
                value={formData.defaultCurrency}
                onChange={(e) => handleChange('defaultCurrency', e.target.value)}
              >
                <option value="USD">USD ($ - US Dollar)</option>
                <option value="EUR">EUR (€ - Euro)</option>
                <option value="GBP">GBP (£ - British Pound)</option>
                <option value="INR">INR (₹ - Indian Rupee)</option>
                <option value="CAD">CAD ($ - Canadian Dollar)</option>
                <option value="AUD">AUD ($ - Australian Dollar)</option>
                <option value="AED">AED (د.إ - UAE Dirham)</option>
                <option value="SAR">SAR (﷼ - Saudi Riyal)</option>
                <option value="SGD">SGD ($ - Singapore Dollar)</option>
                <option value="JPY">JPY (¥ - Japanese Yen)</option>
              </select>
            </div>

            {/* Address */}
            <div className="input-group profile-col-span-2">
              <label className="input-label" htmlFor="prof-company-address">
                <MapPin size={15} /> Business Address
              </label>
              <textarea
                id="prof-company-address"
                className="input-field"
                rows="2"
                placeholder="123 Business Avenue, Suite 400&#10;City, State, Zip, Country"
                value={formData.companyAddress}
                onChange={(e) => handleChange('companyAddress', e.target.value)}
              />
            </div>

            {/* Payment Details */}
            <div className="input-group profile-col-span-2">
              <label className="input-label" htmlFor="prof-payment-details">
                <CreditCard size={15} /> Payment Instructions (Bank, UPI, PayPal, IBAN)
              </label>
              <textarea
                id="prof-payment-details"
                className="input-field"
                rows="2"
                placeholder="Bank Name: City Bank | A/C: 1234567890 | Routing: 987654&#10;Or PayPal: paypal.me/acme"
                value={formData.paymentDetails}
                onChange={(e) => handleChange('paymentDetails', e.target.value)}
              />
            </div>

            {/* Default Notes */}
            <div className="input-group profile-col-span-2">
              <label className="input-label" htmlFor="prof-default-notes">
                Default Terms / Notes
              </label>
              <textarea
                id="prof-default-notes"
                className="input-field"
                rows="2"
                placeholder="Payment is due within 14 days of invoice date. Thank you for your business!"
                value={formData.defaultNotes}
                onChange={(e) => handleChange('defaultNotes', e.target.value)}
              />
            </div>
          </div>

          <div className="profile-footer">
            <label className="profile-checkbox-label">
              <input
                type="checkbox"
                checked={applyToCurrent}
                onChange={(e) => setApplyToCurrent(e.target.checked)}
              />
              <span>Also update company details on current open invoice</span>
            </label>

            <div className="profile-action-btns">
              <button
                type="button"
                className="btn btn-outline"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="btn btn-primary"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving to Cloud...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save Company Profile</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
