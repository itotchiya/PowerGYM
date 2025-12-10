import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/contexts/ThemeContext';

// Theme-aware color palettes
const LIGHT_COLORS = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
const DARK_COLORS = ['#60A5FA', '#4ADE80', '#FBBF24', '#F87171', '#A78BFA', '#22D3EE'];

export function PlanDistributionChart({ members, plans }) {
    const { theme } = useTheme();
    const COLORS = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;

    const data = React.useMemo(() => {
        const distribution = {};

        members.forEach(member => {
            const planId = member.currentSubscription?.planId;
            if (planId) {
                const planName = plans.find(p => p.id === planId)?.name || 'Unknown';
                distribution[planName] = (distribution[planName] || 0) + 1;
            }
        });

        return Object.entries(distribution).map(([name, value]) => ({
            name,
            value
        }));
    }, [members, plans]);

    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle>Plan Distribution</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
                                    border: `1px solid ${theme === 'dark' ? '#374151' : '#E5E7EB'}`,
                                    borderRadius: '8px'
                                }}
                            />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
