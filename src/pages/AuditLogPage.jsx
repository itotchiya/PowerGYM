import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TableSkeleton } from '@/components/skeletons/PageSkeletons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs, query, orderBy, limit, startAfter, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import {
    FileText,
    Search,
    ChevronDown,
    ChevronRight,
    User,
    Calendar,
    Plus,
    Pencil,
    Trash2,
    RotateCcw,
    AlertTriangle
} from 'lucide-react';
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/auditLog';

const LOGS_PER_PAGE = 20;

export function AuditLogPage() {
    const { userProfile } = useAuth();
    const { t } = useTranslation();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [expandedRows, setExpandedRows] = useState(new Set());

    // Filters
    const [entityFilter, setEntityFilter] = useState('all');
    const [actionFilter, setActionFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchLogs = async (isLoadMore = false) => {
        try {
            if (!isLoadMore) {
                setLoading(true);
            }

            if (!userProfile?.gymId) {
                console.warn('No gymId found');
                return;
            }

            const logsRef = collection(db, `gyms/${userProfile.gymId}/auditLogs`);
            let q = query(logsRef, orderBy('timestamp', 'desc'), limit(LOGS_PER_PAGE));

            // Apply filters
            if (entityFilter !== 'all') {
                q = query(logsRef, where('entityType', '==', entityFilter), orderBy('timestamp', 'desc'), limit(LOGS_PER_PAGE));
            }

            if (actionFilter !== 'all') {
                q = query(logsRef, where('action', '==', actionFilter), orderBy('timestamp', 'desc'), limit(LOGS_PER_PAGE));
            }

            // Pagination
            if (isLoadMore && lastDoc) {
                q = query(logsRef, orderBy('timestamp', 'desc'), startAfter(lastDoc), limit(LOGS_PER_PAGE));
            }

            const snapshot = await getDocs(q);
            const logsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            if (isLoadMore) {
                setLogs(prev => [...prev, ...logsData]);
            } else {
                setLogs(logsData);
            }

            setHasMore(snapshot.docs.length === LOGS_PER_PAGE);
            if (snapshot.docs.length > 0) {
                setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
            }

        } catch (error) {
            console.error('Error fetching audit logs:', error);
            toast.error(t('auditLog.loadError'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [userProfile?.gymId, entityFilter, actionFilter]);

    const toggleRowExpand = (logId) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(logId)) {
                newSet.delete(logId);
            } else {
                newSet.add(logId);
            }
            return newSet;
        });
    };

    const getActionIcon = (action) => {
        switch (action) {
            case AUDIT_ACTIONS.CREATED:
                return <Plus className="h-4 w-4" />;
            case AUDIT_ACTIONS.UPDATED:
                return <Pencil className="h-4 w-4" />;
            case AUDIT_ACTIONS.DELETED:
                return <Trash2 className="h-4 w-4" />;
            case AUDIT_ACTIONS.RESTORED:
                return <RotateCcw className="h-4 w-4" />;
            case AUDIT_ACTIONS.PERMANENTLY_DELETED:
                return <AlertTriangle className="h-4 w-4" />;
            default:
                return <FileText className="h-4 w-4" />;
        }
    };

    const getActionBadgeVariant = (action) => {
        switch (action) {
            case AUDIT_ACTIONS.CREATED:
                return 'default';
            case AUDIT_ACTIONS.UPDATED:
                return 'secondary';
            case AUDIT_ACTIONS.DELETED:
                return 'destructive';
            case AUDIT_ACTIONS.RESTORED:
                return 'outline';
            case AUDIT_ACTIONS.PERMANENTLY_DELETED:
                return 'destructive';
            default:
                return 'secondary';
        }
    };

    const getEntityBadgeVariant = (entityType) => {
        switch (entityType) {
            case AUDIT_ENTITIES.MEMBER:
                return 'default';
            case AUDIT_ENTITIES.PLAN:
                return 'secondary';
            case AUDIT_ENTITIES.GYM_SETTINGS:
                return 'outline';
            default:
                return 'secondary';
        }
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString();
    };

    const formatFieldName = (field) => {
        // Convert camelCase to readable format
        return field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    };

    const formatValue = (value) => {
        if (value === null || value === undefined) return '-';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    };

    // Filter logs by search term
    const filteredLogs = logs.filter(log => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            log.entityName?.toLowerCase().includes(search) ||
            log.userName?.toLowerCase().includes(search)
        );
    });

    if (loading) {
        return (
            <DashboardLayout>
                <TableSkeleton />
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">{t('auditLog.title')}</h2>
                        <p className="text-muted-foreground">
                            {t('auditLog.subtitle')}
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">{t('auditLog.filters')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap items-center gap-4">
                            {/* Search */}
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={t('auditLog.search')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9"
                                />
                            </div>

                            {/* Entity Type Filter */}
                            <Select value={entityFilter} onValueChange={setEntityFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder={t('auditLog.entityType')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('common.all')}</SelectItem>
                                    <SelectItem value={AUDIT_ENTITIES.MEMBER}>{t('auditLog.entities.member')}</SelectItem>
                                    <SelectItem value={AUDIT_ENTITIES.PLAN}>{t('auditLog.entities.plan')}</SelectItem>
                                    <SelectItem value={AUDIT_ENTITIES.GYM_SETTINGS}>{t('auditLog.entities.gym_settings')}</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Action Type Filter */}
                            <Select value={actionFilter} onValueChange={setActionFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder={t('auditLog.actionType')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('common.all')}</SelectItem>
                                    <SelectItem value={AUDIT_ACTIONS.CREATED}>{t('auditLog.actions.created')}</SelectItem>
                                    <SelectItem value={AUDIT_ACTIONS.UPDATED}>{t('auditLog.actions.updated')}</SelectItem>
                                    <SelectItem value={AUDIT_ACTIONS.DELETED}>{t('auditLog.actions.deleted')}</SelectItem>
                                    <SelectItem value={AUDIT_ACTIONS.RESTORED}>{t('auditLog.actions.restored')}</SelectItem>
                                    <SelectItem value={AUDIT_ACTIONS.PERMANENTLY_DELETED}>{t('auditLog.actions.permanently_deleted')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Audit Log Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {t('auditLog.title')} ({filteredLogs.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {filteredLogs.length === 0 ? (
                            <div className="text-center py-12">
                                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">{t('auditLog.noLogs')}</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-10"></TableHead>
                                        <TableHead>{t('auditLog.timestamp')}</TableHead>
                                        <TableHead>{t('auditLog.user')}</TableHead>
                                        <TableHead>{t('auditLog.actionType')}</TableHead>
                                        <TableHead>{t('auditLog.entityType')}</TableHead>
                                        <TableHead>{t('common.name')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLogs.map(log => (
                                        <Collapsible key={log.id} asChild>
                                            <>
                                                <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRowExpand(log.id)}>
                                                    <TableCell>
                                                        <CollapsibleTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                                                                {expandedRows.has(log.id) ? (
                                                                    <ChevronDown className="h-4 w-4" />
                                                                ) : (
                                                                    <ChevronRight className="h-4 w-4" />
                                                                )}
                                                            </Button>
                                                        </CollapsibleTrigger>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                                            {formatTimestamp(log.timestamp)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <User className="h-4 w-4 text-muted-foreground" />
                                                            <span>{log.userName}</span>
                                                            <Badge variant="outline" className="text-xs">
                                                                {log.userRole}
                                                            </Badge>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={getActionBadgeVariant(log.action)} className="gap-1">
                                                            {getActionIcon(log.action)}
                                                            {t(`auditLog.actions.${log.action}`)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={getEntityBadgeVariant(log.entityType)}>
                                                            {t(`auditLog.entities.${log.entityType}`)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {log.entityName}
                                                    </TableCell>
                                                </TableRow>
                                                <CollapsibleContent asChild>
                                                    <TableRow className="bg-muted/30">
                                                        <TableCell colSpan={6}>
                                                            <div className="py-3 px-4">
                                                                {log.changes && log.changes.length > 0 ? (
                                                                    <div className="space-y-2">
                                                                        <h4 className="font-semibold text-sm">{t('auditLog.changeDetails')}</h4>
                                                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                                                            <div className="font-medium text-muted-foreground">{t('auditLog.field')}</div>
                                                                            <div className="font-medium text-muted-foreground">{t('auditLog.oldValue')}</div>
                                                                            <div className="font-medium text-muted-foreground">{t('auditLog.newValue')}</div>
                                                                            {log.changes.map((change, idx) => (
                                                                                <>
                                                                                    <div key={`field-${idx}`} className="font-medium">{formatFieldName(change.field)}</div>
                                                                                    <div key={`old-${idx}`} className="text-destructive line-through">{formatValue(change.oldValue)}</div>
                                                                                    <div key={`new-${idx}`} className="text-green-600">{formatValue(change.newValue)}</div>
                                                                                </>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-sm text-muted-foreground">
                                                                        {log.action === AUDIT_ACTIONS.CREATED && 'New entity was created'}
                                                                        {log.action === AUDIT_ACTIONS.DELETED && 'Entity was soft deleted'}
                                                                        {log.action === AUDIT_ACTIONS.RESTORED && 'Entity was restored from deleted state'}
                                                                        {log.action === AUDIT_ACTIONS.PERMANENTLY_DELETED && 'Entity was permanently deleted from database'}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                </CollapsibleContent>
                                            </>
                                        </Collapsible>
                                    ))}
                                </TableBody>
                            </Table>
                        )}

                        {/* Load More */}
                        {hasMore && filteredLogs.length > 0 && (
                            <div className="flex justify-center mt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => fetchLogs(true)}
                                    disabled={loading}
                                >
                                    {t('common.loadMore')}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
