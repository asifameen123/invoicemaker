import React from 'react';
import { Download, Printer, Loader2 } from 'lucide-react';

export default function InvoicePreview({ invoiceData, previewRef, onDownloadPng, onPrint, isDownloadingPng, activeTab }) {
    const containerRef = React.useRef(null);
    const [scale, setScale] = React.useState(1);
    const [pageHeight, setPageHeight] = React.useState(1123);
    const [zoomMode, setZoomMode] = React.useState('fit'); // 'fit' | '100%'

    const updateScale = React.useCallback(() => {
        const container = containerRef.current;
        if (!container) return;

        let containerWidth = container.clientWidth;
        if (containerWidth <= 0) {
            const parent = container.parentElement;
            containerWidth = (parent && parent.clientWidth > 0) ? parent.clientWidth : (window.innerWidth - 32);
        }

        const isMobile = window.innerWidth <= 640;
        const padding = isMobile ? 12 : 48;
        const availableWidth = Math.max(260, containerWidth - padding);
        const A4_WIDTH = 794;

        const pageEl = container.querySelector('#invoice-page-element');
        if (pageEl) {
            setPageHeight(pageEl.scrollHeight || 1123);
        }

        if (zoomMode === '100%') {
            setScale(1);
        } else if (availableWidth > 0 && availableWidth < A4_WIDTH) {
            const s = Math.min(1, Math.max(0.2, availableWidth / A4_WIDTH));
            setScale(s);
        } else {
            setScale(1);
        }
    }, [zoomMode]);

    React.useEffect(() => {
        updateScale();
        const rafId = requestAnimationFrame(updateScale);
        const timerId = setTimeout(updateScale, 50);

        const ro = new ResizeObserver(() => {
            updateScale();
        });
        if (containerRef.current) ro.observe(containerRef.current);
        window.addEventListener('resize', updateScale);

        return () => {
            cancelAnimationFrame(rafId);
            clearTimeout(timerId);
            ro.disconnect();
            window.removeEventListener('resize', updateScale);
        };
    }, [updateScale, activeTab, invoiceData]);

    const formatCurrency = (amount) => {
        const currency = invoiceData.currency || 'USD';
        const localeMap = {
            'USD': 'en-US',
            'INR': 'en-IN',
            'AED': 'en-AE',
        };
        const locale = localeMap[currency] || 'en-US';

        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
        }).format(amount);
    };

    const calculateSubtotal = () => {
        return invoiceData.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
    };

    const subtotal = calculateSubtotal();

    let discountAmount = 0;
    if (invoiceData.discount > 0) {
        if (invoiceData.discountType === 'percentage') {
            discountAmount = subtotal * (invoiceData.discount / 100);
        } else {
            discountAmount = parseFloat(invoiceData.discount) || 0;
        }
    }

    const subtotalAfterDiscount = subtotal - discountAmount;

    let tax = 0;
    if (invoiceData.showTaxColumn) {
        tax = invoiceData.items.reduce((acc, item) => acc + (item.quantity * item.price * (item.tax || 0) / 100), 0);
    }

    const total = subtotalAfterDiscount + tax;
    const amountPaid = parseFloat(invoiceData.amountPaid) || 0;
    const balanceDue = total - amountPaid;

    return (
        <div className="preview-container-wrapper">
            <div className="preview-toolbar no-print">
                <div className="preview-toolbar-title flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-200">A4 Preview</span>
                    <span className="preview-live-badge">Live</span>
                </div>
                <div className="preview-toolbar-controls flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setZoomMode(prev => (prev === 'fit' ? '100%' : 'fit'))}
                        className="btn btn-zoom text-xs py-1 px-2 rounded"
                        title={zoomMode === 'fit' ? "Switch to 100% full scale" : "Auto-fit invoice to screen"}
                    >
                        {zoomMode === 'fit' ? '🔍 Fit' : '🔍 100%'}
                    </button>
                    {onDownloadPng && (
                        <button
                            type="button"
                            onClick={onDownloadPng}
                            disabled={isDownloadingPng}
                            className="btn btn-secondary text-xs py-1 px-2 flex items-center gap-1"
                            title="Download invoice as PNG image"
                        >
                            {isDownloadingPng ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                            <span>PNG</span>
                        </button>
                    )}
                    {onPrint && (
                        <button
                            type="button"
                            onClick={onPrint}
                            className="btn btn-primary text-xs py-1 px-2 flex items-center gap-1"
                            title="Print or save as PDF"
                        >
                            <Printer size={13} />
                            <span>PDF</span>
                        </button>
                    )}
                </div>
            </div>

            <div 
                ref={containerRef}
                className="invoice-preview-container no-print-bg"
            >
                <div 
                    className="invoice-scale-wrapper"
                    style={{
                        width: scale < 1 ? `${Math.ceil(794 * scale)}px` : 'auto',
                        height: scale < 1 ? `${Math.ceil(pageHeight * scale)}px` : 'auto',
                    }}
                >
                    <div 
                        ref={previewRef}
                        id="invoice-page-element"
                        className="invoice-page bg-white shadow-lg relative text-sm"
                        style={{
                            transform: scale < 1 ? `scale(${scale})` : 'none',
                            transformOrigin: 'top left',
                        }}
                    >

                {/* Header */}
                <div className="flex justify-between items-start mb-12">
                    <div>
                        <h1 className="text-4xl font-bold mb-2" style={{ color: invoiceData.headerColor || '#1e293b' }}>INVOICE</h1>
                        {invoiceData.visibleFields?.invoiceNumber !== false && (
                            <p className="text-gray-500">
                                {invoiceData.invoiceNumber
                                    ? (invoiceData.invoiceNumber.startsWith('#') ? invoiceData.invoiceNumber : `#${invoiceData.invoiceNumber}`)
                                    : '#1001'}
                            </p>
                        )}
                    </div>
                    <div className="text-right">
                        {invoiceData.visibleFields?.companyName !== false && (
                            <h2 className={`text-xl font-bold ${invoiceData.companyName ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                                {invoiceData.companyName || 'Company Name'}
                            </h2>
                        )}
                        {invoiceData.visibleFields?.companyDescription !== false && invoiceData.companyDescription && (
                            <p className="text-sm text-slate-500 italic mb-1">{invoiceData.companyDescription}</p>
                        )}
                        {invoiceData.visibleFields?.companyAddress !== false && (
                            <p className={`whitespace-pre-line ${invoiceData.companyAddress ? 'text-gray-500' : 'text-gray-300 italic'}`}>
                                {invoiceData.companyAddress || 'Company Address'}
                            </p>
                        )}
                        {invoiceData.visibleFields?.companyEmail !== false && (
                            <p className={invoiceData.companyEmail ? 'text-gray-500' : 'text-gray-300 italic'}>
                                {invoiceData.companyEmail || 'billing@company.com'}
                            </p>
                        )}
                        {(invoiceData.contactNumber || invoiceData.yourName) && (
                            <p className="text-gray-500">
                                {invoiceData.contactNumber || invoiceData.yourName}
                            </p>
                        )}
                    </div>
                </div>

                {/* Client & Date Info */}
                <div className="flex justify-between mb-12">
                    <div>
                        <h3 className="text-gray-500 font-medium mb-1">Bill To:</h3>
                        {invoiceData.visibleFields?.clientName !== false && (
                            <h4 className="text-lg font-bold text-slate-800">{invoiceData.clientName || 'Client Name'}</h4>
                        )}
                        {invoiceData.visibleFields?.clientDescription !== false && invoiceData.clientDescription && (
                            <p className="text-sm text-slate-500 italic mb-1">{invoiceData.clientDescription}</p>
                        )}
                        {invoiceData.visibleFields?.clientAddress !== false && (
                            <div className="text-gray-500 whitespace-pre-line">{invoiceData.clientAddress || 'Client Address'}</div>
                        )}
                    </div>
                    <div className="text-right">
                        {invoiceData.visibleFields?.date !== false && (
                            <div className="mb-2">
                                <span className="text-gray-500 font-medium">Date: </span>
                                <span className="font-semibold text-slate-700">{invoiceData.date}</span>
                            </div>
                        )}
                        {invoiceData.visibleFields?.dueDate !== false && (
                            <div>
                                <span className="text-gray-500 font-medium">Due Date: </span>
                                <span className="font-semibold text-slate-700">{invoiceData.dueDate}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Items Table */}
                <div className="mb-8 flex-grow">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-slate-200">
                                <th className="py-3 font-semibold text-slate-600">Description</th>
                                <th className="py-3 font-semibold text-slate-600 text-center">Qty</th>
                                <th className="py-3 font-semibold text-slate-600 text-right">Price</th>
                                {invoiceData.showTaxColumn && (
                                    <th className="py-3 font-semibold text-slate-600 text-right">Tax</th>
                                )}
                                <th className="py-3 font-semibold text-slate-600 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoiceData.items.map((item, index) => (
                                <tr key={index} className="border-b border-slate-100">
                                    <td className="py-3 text-slate-700">{item.description || 'Item description'}</td>
                                    <td className="py-3 text-slate-700 text-center">{item.quantity}</td>
                                    <td className="py-3 text-slate-700 text-right">{formatCurrency(item.price)}</td>
                                    {invoiceData.showTaxColumn && (
                                        <td className="py-3 text-slate-700 text-right">{item.tax || 0}%</td>
                                    )}
                                    <td className="py-3 text-slate-700 text-right font-medium">
                                        {formatCurrency(item.quantity * item.price)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {invoiceData.items.length === 0 && (
                        <div className="text-center py-8 text-gray-400 italic">No items added</div>
                    )}
                </div>

                {/* Totals */}
                <div className="flex justify-end mb-12">
                    <div className="w-1/2 max-w-xs">
                        <div className="flex justify-between py-2 border-b border-slate-100">
                            <span className="text-gray-500">Subtotal</span>
                            <span className="font-semibold text-slate-700">{formatCurrency(subtotal)}</span>
                        </div>
                        {discountAmount > 0 && (
                            <div className="flex justify-between py-2 border-b border-slate-100 text-green-600">
                                <span>Discount {invoiceData.discountType === 'percentage' ? `(${invoiceData.discount}%)` : ''}</span>
                                <span className="font-semibold">-{formatCurrency(discountAmount)}</span>
                            </div>
                        )}
                        {invoiceData.showTaxColumn && tax > 0 && (
                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-gray-500">Tax</span>
                                <span className="font-semibold text-slate-700">{formatCurrency(tax)}</span>
                            </div>
                        )}
                        <div className="flex justify-between py-3 border-b-2 border-slate-800">
                            <span className="font-bold text-slate-800 text-lg">Total</span>
                            <span className="font-bold text-xl" style={{ color: invoiceData.totalAmountColor || '#2563eb' }}>{formatCurrency(total)}</span>
                        </div>
                        {amountPaid > 0 && (
                            <>
                                <div className="flex justify-between py-2 border-b border-slate-100 text-gray-500">
                                    <span>Amount Paid</span>
                                    <span className="font-semibold text-slate-700">-{formatCurrency(amountPaid)}</span>
                                </div>
                                <div className="flex justify-between py-3">
                                    <span className="font-bold text-slate-800 text-lg">Balance Due</span>
                                    <span className="font-bold text-xl text-slate-800">{formatCurrency(balanceDue)}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Footer */}
                {invoiceData.visibleFields?.notes !== false && (
                    <div className="mt-auto pt-8 border-t border-slate-100 text-center text-gray-400 text-sm">
                        {invoiceData.notes || 'Thank you for your business!'}
                    </div>
                )}

            </div>
                </div>
            </div>
        </div>
    );
}
