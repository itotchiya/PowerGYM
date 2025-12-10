import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const STATUS_COLORS = {
    active: '#10b981', // Green
    expiring: '#f59e0b', // Amber
    expired: '#ef4444'  // Red
};

export function MemberStatusChart({ members }) {
    const data = React.useMemo(() => {
        let active = 0;
        let expiring = 0;
        let expired = 0;

        const today = new Date();

        members.forEach(member => {
            if (!member.currentSubscription?.endDate) {
                // Assuming no end date means inactive or invalid for this chart, 
                // or maybe we should check a status field if it exists. 
                // For now, let's rely on the getMemberStatus logic we used elsewhere if possible, 
                // or reimplement simple logic here.
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
    }, [members]);

    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle>Member Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip cursor={{ fill: 'transparent' }} />
                            <Legend />
                            <Bar dataKey="value" name="Members">
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
