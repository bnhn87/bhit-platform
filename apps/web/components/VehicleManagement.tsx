import React, { useState } from 'react';

import { theme } from '../lib/theme';

export interface Vehicle {
    id: string;
    name: string;
    costPerDay: number;
    euroPalletCapacity: number;
    standardPalletCapacity: number;
    isActive: boolean;
}

interface VehicleManagementProps {
    vehicles: Record<string, Vehicle>;
    onVehiclesChange: (vehicles: Record<string, Vehicle>) => void;
    readonly?: boolean;
}

export const VehicleManagement: React.FC<VehicleManagementProps> = ({ 
    vehicles, 
    onVehiclesChange, 
    readonly = false 
}) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<string | null>(null);

    const vehicleList = Object.values(vehicles);

    const handleAddVehicle = (vehicle: Omit<Vehicle, 'id'>) => {
        const id = `vehicle-${Date.now()}`;
        const newVehicle: Vehicle = { ...vehicle, id };
        onVehiclesChange({ ...vehicles, [id]: newVehicle });
        setShowAddForm(false);
    };

    const handleUpdateVehicle = (id: string, updates: Partial<Vehicle>) => {
        const updatedVehicle = { ...vehicles[id], ...updates };
        onVehiclesChange({ ...vehicles, [id]: updatedVehicle });
        setEditingVehicle(null);
    };

    const handleDeleteVehicle = (id: string) => {
        const { [id]: _, ...remainingVehicles } = vehicles;
        onVehiclesChange(remainingVehicles);
    };

    const handleToggleActive = (id: string) => {
        handleUpdateVehicle(id, { isActive: !vehicles[id].isActive });
    };

    return (
        <div style={{ display: 'grid', gap: 16 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Vehicle Fleet</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: 12, color: theme.colors.textSubtle }}>
                        Manage your delivery vehicles and their pallet capacities
                    </p>
                </div>
                {!readonly && (
                    <button
                        onClick={() => setShowAddForm(true)}
                        style={{
                            padding: '8px 12px',
                            background: theme.colors.accent,
                            color: 'white',
                            border: 0,
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 500
                        }}
                    >
                        Add Vehicle
                    </button>
                )}
            </div>

            {/* Vehicle List */}
            <div style={{ display: 'grid', gap: 8 }}>
                {/* Headers */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 100px 80px 80px 80px 100px',
                    gap: 12,
                    padding: '8px 0',
                    fontSize: 12,
                    fontWeight: 600,
                    color: theme.colors.textSubtle,
                    borderBottom: `1px solid ${theme.colors.border}`
                }}>
                    <div>Vehicle Name</div>
                    <div>Cost/Day</div>
                    <div>Euro</div>
                    <div>Standard</div>
                    <div>Status</div>
                    <div>Actions</div>
                </div>

                {vehicleList.map(vehicle => (
                    <VehicleRow
                        key={vehicle.id}
                        vehicle={vehicle}
                        isEditing={editingVehicle === vehicle.id}
                        onEdit={() => setEditingVehicle(vehicle.id)}
                        onSave={(updates) => handleUpdateVehicle(vehicle.id, updates)}
                        onCancel={() => setEditingVehicle(null)}
                        onDelete={() => handleDeleteVehicle(vehicle.id)}
                        onToggleActive={() => handleToggleActive(vehicle.id)}
                        readonly={readonly}
                    />
                ))}

                {vehicleList.length === 0 && (
                    <div style={{
                        padding: 24,
                        textAlign: 'center',
                        color: theme.colors.textSubtle,
                        fontSize: 14
                    }}>
                        No vehicles configured. Add your first vehicle to get started.
                    </div>
                )}
            </div>

            {/* Add Vehicle Form */}
            {showAddForm && (
                <VehicleForm
                    onSubmit={handleAddVehicle}
                    onCancel={() => setShowAddForm(false)}
                />
            )}
        </div>
    );
};

interface VehicleRowProps {
    vehicle: Vehicle;
    isEditing: boolean;
    onEdit: () => void;
    onSave: (updates: Partial<Vehicle>) => void;
    onCancel: () => void;
    onDelete: () => void;
    onToggleActive: () => void;
    readonly: boolean;
}

const VehicleRow: React.FC<VehicleRowProps> = ({
    vehicle,
    isEditing,
    onEdit,
    onSave,
    onCancel,
    onDelete,
    onToggleActive,
    readonly
}) => {
    const [formData, setFormData] = useState(vehicle);

    const handleSave = () => {
        onSave(formData);
    };

    if (isEditing && !readonly) {
        return (
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 100px 80px 80px 80px 100px',
                gap: 12,
                alignItems: 'center',
                padding: 8,
                background: theme.colors.muted,
                borderRadius: 6
            }}>
                <input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={inputStyle()}
                />
                <input
                    type="number"
                    value={formData.costPerDay}
                    onChange={(e) => setFormData({ ...formData, costPerDay: Number(e.target.value) })}
                    style={inputStyle()}
                />
                <input
                    type="number"
                    value={formData.euroPalletCapacity}
                    onChange={(e) => setFormData({ ...formData, euroPalletCapacity: Number(e.target.value) })}
                    style={inputStyle()}
                />
                <input
                    type="number"
                    value={formData.standardPalletCapacity}
                    onChange={(e) => setFormData({ ...formData, standardPalletCapacity: Number(e.target.value) })}
                    style={inputStyle()}
                />
                <button
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    style={{
                        padding: '4px 8px',
                        borderRadius: 4,
                        border: `1px solid ${theme.colors.border}`,
                        background: formData.isActive ? theme.colors.accent : 'transparent',
                        color: formData.isActive ? 'white' : theme.colors.text,
                        cursor: 'pointer',
                        fontSize: 11
                    }}
                >
                    {formData.isActive ? 'Active' : 'Inactive'}
                </button>
                <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={handleSave} style={actionButtonStyle(theme.colors.accent)}>Save</button>
                    <button onClick={onCancel} style={actionButtonStyle(theme.colors.textSubtle)}>Cancel</button>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 100px 80px 80px 80px 100px',
            gap: 12,
            alignItems: 'center',
            padding: 8,
            borderRadius: 6,
            opacity: vehicle.isActive ? 1 : 0.6
        }}>
            <div style={{ fontWeight: 500 }}>{vehicle.name}</div>
            <div>£{vehicle.costPerDay}</div>
            <div>{vehicle.euroPalletCapacity}</div>
            <div>{vehicle.standardPalletCapacity}</div>
            <button
                onClick={onToggleActive}
                disabled={readonly}
                style={{
                    padding: '4px 8px',
                    borderRadius: 4,
                    border: `1px solid ${theme.colors.border}`,
                    background: vehicle.isActive ? theme.colors.accent : 'transparent',
                    color: vehicle.isActive ? 'white' : theme.colors.text,
                    cursor: readonly ? 'not-allowed' : 'pointer',
                    fontSize: 11,
                    opacity: readonly ? 0.5 : 1
                }}
            >
                {vehicle.isActive ? 'Active' : 'Inactive'}
            </button>
            <div style={{ display: 'flex', gap: 4 }}>
                {!readonly && (
                    <>
                        <button onClick={onEdit} style={actionButtonStyle(theme.colors.accent)}>Edit</button>
                        <button onClick={onDelete} style={actionButtonStyle(theme.colors.warn)}>Delete</button>
                    </>
                )}
            </div>
        </div>
    );
};

interface VehicleFormProps {
    onSubmit: (vehicle: Omit<Vehicle, 'id'>) => void;
    onCancel: () => void;
}

const VehicleForm: React.FC<VehicleFormProps> = ({ onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        costPerDay: 0,
        euroPalletCapacity: 0,
        standardPalletCapacity: 0,
        isActive: true
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.name.trim()) {
            onSubmit(formData);
        }
    };

    return (
        <div style={{
            padding: 16,
            background: theme.colors.muted,
            borderRadius: 8,
            border: `1px solid ${theme.colors.border}`
        }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>Add New Vehicle</h4>
            <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8, alignItems: 'center' }}>
                        <label style={{ fontSize: 12, color: theme.colors.textSubtle }}>Vehicle Name:</label>
                        <input
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Large Van (Sprinter)"
                            style={inputStyle()}
                        />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                        <div style={{ display: 'grid', gap: 4 }}>
                            <label style={{ fontSize: 12, color: theme.colors.textSubtle }}>Cost per Day (£):</label>
                            <input
                                type="number"
                                required
                                min="0"
                                value={formData.costPerDay}
                                onChange={(e) => setFormData({ ...formData, costPerDay: Number(e.target.value) })}
                                style={inputStyle()}
                            />
                        </div>
                        <div style={{ display: 'grid', gap: 4 }}>
                            <label style={{ fontSize: 12, color: theme.colors.textSubtle }}>Euro Pallets:</label>
                            <input
                                type="number"
                                required
                                min="0"
                                value={formData.euroPalletCapacity}
                                onChange={(e) => setFormData({ ...formData, euroPalletCapacity: Number(e.target.value) })}
                                style={inputStyle()}
                            />
                        </div>
                        <div style={{ display: 'grid', gap: 4 }}>
                            <label style={{ fontSize: 12, color: theme.colors.textSubtle }}>Standard Pallets:</label>
                            <input
                                type="number"
                                required
                                min="0"
                                value={formData.standardPalletCapacity}
                                onChange={(e) => setFormData({ ...formData, standardPalletCapacity: Number(e.target.value) })}
                                style={inputStyle()}
                            />
                        </div>
                    </div>
                    <div style={{ fontSize: 11, color: theme.colors.textSubtle, fontStyle: 'italic' }}>
                        Euro pallets: 1200mm × 800mm | Standard pallets: 1200mm × 1000mm
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <button type="submit" style={actionButtonStyle(theme.colors.accent)}>Add Vehicle</button>
                    <button type="button" onClick={onCancel} style={actionButtonStyle(theme.colors.textSubtle)}>Cancel</button>
                </div>
            </form>
        </div>
    );
};

const inputStyle = (): React.CSSProperties => ({
    padding: '6px 8px',
    background: theme.colors.panel,
    border: `1px solid ${theme.colors.border}`,
    color: theme.colors.text,
    borderRadius: 4,
    fontSize: 12
});

const actionButtonStyle = (color: string): React.CSSProperties => ({
    padding: '4px 8px',
    background: color,
    color: 'white',
    border: 0,
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 500
});