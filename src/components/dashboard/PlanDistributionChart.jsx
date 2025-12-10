import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function PlanDistributionChart({ members, plans }) {
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
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
