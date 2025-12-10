import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/contexts/ThemeContext';

export function MemberStatusChart({ members }) {
    const { theme } = useTheme();

    // Theme-aware colors
    const STATUS_COLORS = {
        active: theme === 'dark' ? '#22C55E' : '#16A34A',      // green-500/600
        expiring: theme === 'dark' ? '#F59E0B' : '#D97706',    // amber-500/600
        expired: theme === 'dark' ? '#EF4444' : '#DC2626'       // red-500/600
    };

    const data = React.useMemo(() => {
        let active = 0;
        let expiring = 0;
        let expired = 0;

        const today = new Date();

        members.forEach(member => {
            if (!member.currentSubscription?.endDate) {
                return;
            }

            const endDate = new Date(member.currentSubscription.endDate);
            const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

            if (daysLeft < 0) {
                expired++;
            } else if (daysLeft <= 7) {
                expiring++;
            } else {
                active++;
            }
        });

        return [
            { name: 'Active', value: active, fill: STATUS_COLORS.active },
            { name: 'Expiring Soon', value: expiring, fill: STATUS_COLORS.expiring },
            { name: 'Expired', value: expired, fill: STATUS_COLORS.expired },
        ];
    }, [members, theme]);

    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle>Member Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} />
                            <XAxis dataKey="name" tick={{ fill: theme === 'dark' ? '#9CA3AF' : '#4B5563' }} />
                            <YAxis tick={{ fill: theme === 'dark' ? '#9CA3AF' : '#4B5563' }} />
                            <Tooltip
                                cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                                contentStyle={{
                                    backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
                                    border: `1px solid ${theme === 'dark' ? '#374151' : '#E5E7EB'}`,
                                    borderRadius: '8px'
                                }}
                            />
                            <Legend />
                            <Bar dataKey="value" name="Members" radius={[4, 4, 0, 0]}>
                                {
                                    data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))
                                }
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
