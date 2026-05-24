/**
 * components/ImageUploadBox.jsx
 * Reusable image upload box — shows preview if URL exists, or upload prompt.
 * Handles both DB paths (prepends IMG_API) and new base64 uploads.
 */

import React from 'react';
import { Typography } from 'antd';

const { Text } = Typography;

// Adjust this to your backend image base URL
const IMG_API = import.meta.env.VITE_IMG_API || 'http://localhost:5000/view-image/';

export const ImageUploadBox = ({ label, imageUrl, onChange, icon }) => {
    const isNewUpload = imageUrl?.startsWith('data:') || imageUrl?.startsWith('blob:');
    const displayUrl = isNewUpload ? imageUrl : (imageUrl ? IMG_API + imageUrl : null);

    return (
        <div
            style={{
                border: '1.5px dashed #d9d9d9',
                borderRadius: 10,
                padding: 12,
                textAlign: 'center',
                background: '#fafafa',
                minHeight: 120,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
            }}
        >
            {imageUrl ? (
                <>
                    <img
                        src={displayUrl}
                        alt={label}
                        style={{ maxHeight: 100, maxWidth: '100%', borderRadius: 8, objectFit: 'cover' }}
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/100?text=Error'; }}
                    />
                    <label style={{ fontSize: 11, color: '#2563eb', cursor: 'pointer' }}>
                        Change
                        <input type="file" accept="image/*" onChange={onChange} style={{ display: 'none' }} />
                    </label>
                </>
            ) : (
                <label
                    style={{
                        cursor: 'pointer', color: '#666',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    }}
                >
                    {icon}
                    <Text style={{ fontSize: 12 }}>{label}</Text>
                    <Text style={{ fontSize: 10, color: '#aaa' }}>Click to upload</Text>
                    <input type="file" accept="image/*" onChange={onChange} style={{ display: 'none' }} />
                </label>
            )}
        </div>
    );
};