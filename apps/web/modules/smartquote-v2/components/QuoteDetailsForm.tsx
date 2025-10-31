// ========================================
// SmartQuote v2.0 - Quote Details Form
// ========================================
// Enhanced form for quote details with validation

import React from 'react';

interface QuoteDetailsFormProps {
    details: any;
    onChange: (details: any) => void;
    errors?: Record<string, string>;
}

export default function QuoteDetailsForm({ 
    details, 
    onChange, 
    errors = {} 
}: QuoteDetailsFormProps) {
    
    const handleChange = (field: string, value: any) => {
        onChange({ ...details, [field]: value });
    };

    const inputClass = (field: string) => 
        `w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:ring-2 ${
            errors[field] ? 'border-2 border-red-500 focus:ring-red-500' : 'focus:ring-purple-500'
        } outline-none transition-all`;

    return (
        <div className="bg-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-xl font-bold text-white mb-4">Quote Details</h3>
            
            {/* Client Name */}
            <div>
                <label className="block text-slate-300 font-medium mb-2">
                    Client Name *
                </label>
                <input
                    type="text"
                    value={details.client || ''}
                    onChange={(e) => handleChange('client', e.target.value)}
                    className={inputClass('client')}
                    placeholder="Enter client name"
                />
                {errors.client && (
                    <p className="text-red-400 text-sm mt-1">{errors.client}</p>
                )}
            </div>

            {/* Project Name */}
            <div>
                <label className="block text-slate-300 font-medium mb-2">
                    Project Name *
                </label>
                <input
                    type="text"
                    value={details.project || ''}
                    onChange={(e) => handleChange('project', e.target.value)}
                    className={inputClass('project')}
                    placeholder="Enter project name"
                />
                {errors.project && (
                    <p className="text-red-400 text-sm mt-1">{errors.project}</p>
                )}
            </div>

            {/* Quote Reference */}
            <div>
                <label className="block text-slate-300 font-medium mb-2">
                    Quote Reference *
                </label>
                <input
                    type="text"
                    value={details.quoteRef || ''}
                    onChange={(e) => handleChange('quoteRef', e.target.value)}
                    className={inputClass('quoteRef')}
                    placeholder="e.g., BHIT-2025-001"
                />
                {errors.quoteRef && (
                    <p className="text-red-400 text-sm mt-1">{errors.quoteRef}</p>
                )}
            </div>

            {/* Contact Person */}
            <div>
                <label className="block text-slate-300 font-medium mb-2">
                    Contact Person
                </label>
                <input
                    type="text"
                    value={details.contactPerson || ''}
                    onChange={(e) => handleChange('contactPerson', e.target.value)}
                    className={inputClass('contactPerson')}
                    placeholder="Enter contact name"
                />
            </div>

            {/* Email */}
            <div>
                <label className="block text-slate-300 font-medium mb-2">
                    Email
                </label>
                <input
                    type="email"
                    value={details.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={inputClass('email')}
                    placeholder="contact@example.com"
                />
            </div>
        </div>
    );
}
