// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Button from 'antd/lib/button';
import Empty from 'antd/lib/empty';
import Result from 'antd/lib/result';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import Title from 'antd/lib/typography/Title';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, ChartData, ChartOptions,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Bar } from 'react-chartjs-2';

import { getCore, ServerError } from 'cvat-core-wrapper';
import CVATLoadingSpinner from 'components/common/loading-spinner';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const core = getCore();
type CountsResponse = Awaited<ReturnType<typeof core.analytics.annotationCounts>>;
type RequestState = { taskID: number } & (
    { status: 'loading' } |
    { status: 'success'; data: CountsResponse } |
    { status: 'error'; code: number }
);

const chartOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: {
        x: {
            beginAtZero: true,
            grace: '15%',
            ticks: { precision: 0 },
            title: { display: true, text: 'Saved annotations' },
        },
        y: { ticks: { autoSkip: false } },
    },
    plugins: {
        legend: { display: false },
        datalabels: { anchor: 'end', align: 'end', color: '#303030' },
    },
};

function errorDescription(code: number): string {
    if (code === 401) return 'Your session has expired. Please sign in again.';
    if (code === 403) return 'You do not have access to this task.';
    if (code === 404) return 'This task could not be found.';
    return 'The request failed. Please try again.';
}

function AnnotationAnalyticsPage(): JSX.Element {
    const { tid } = useParams<{ tid: string }>();
    const taskID = Number(tid);
    const validTaskID = /^[1-9]\d*$/.test(tid) && Number.isSafeInteger(taskID);
    const [attempt, setAttempt] = useState(0);
    const [state, setState] = useState<RequestState>({ taskID, status: 'loading' });

    useEffect(() => {
        if (!validTaskID) return undefined;

        const controller = new AbortController();
        let active = true;
        setState({ taskID, status: 'loading' });

        core.analytics.annotationCounts(taskID, controller.signal).then((data) => {
            if (data.task_id !== taskID) throw new Error('Unexpected task response');
            if (active) setState({ taskID, status: 'success', data });
        }).catch((error: unknown) => {
            if (active) {
                setState({ taskID, status: 'error', code: error instanceof ServerError ? error.code : 0 });
            }
        });

        return () => {
            active = false;
            controller.abort();
        };
    }, [taskID, validTaskID, attempt]);

    // Hide old results immediately, before the new task's effect runs.
    const current: RequestState = state.taskID === taskID ? state : { taskID, status: 'loading' };
    const counts = useMemo(() => (current.status === 'success' ? [...current.data.counts].sort(
        (left, right) => right.count - left.count || left.label_name.localeCompare(right.label_name),
    ) : []), [current]);
    const chartData: ChartData<'bar', number[], string[]> = {
        labels: counts.map((row) => row.label_name.match(/.{1,24}/g) || [row.label_name]),
        datasets: [{ label: 'Saved annotations', data: counts.map((row) => row.count), backgroundColor: '#1890ff' }],
    };
    const rowHeight = Math.max(1, ...counts.map((row) => Math.ceil(row.label_name.length / 24))) * 16 + 16;

    let content: JSX.Element;
    if (!validTaskID) {
        content = <Result status='404' title='Invalid task ID' />;
    } else if (current.status === 'loading') {
        content = (
            <div role='status' className='cvat-annotation-analytics-loading'>
                <CVATLoadingSpinner />
                <Text>Loading annotation analytics...</Text>
            </div>
        );
    } else if (current.status === 'error') {
        content = (
            <Result
                status='error'
                title='Could not load annotation analytics'
                subTitle={errorDescription(current.code)}
                extra={(
                    <>
                        <Button type='primary' onClick={() => setAttempt((value) => value + 1)}>Retry</Button>
                        {current.code === 401 && (
                            <a href={`/auth/login?next=${encodeURIComponent(`/tasks/${taskID}/annotation-analytics`)}`}>
                                Sign in
                            </a>
                        )}
                    </>
                )}
            />
        );
    } else {
        content = (
            <>
                <Text strong className='cvat-annotation-analytics-summary'>
                    {`${current.data.total} saved annotations across ${counts.length} classes`}
                </Text>
                {counts.length === 0 ? (
                    <Empty description='No annotations are available for this task.' />
                ) : (
                    <div className='cvat-annotation-analytics-chart-scroll'>
                        <div className='cvat-annotation-analytics-chart' style={{ height: counts.length * rowHeight + 60 }}>
                            <Bar
                                data={chartData}
                                options={chartOptions}
                                plugins={[ChartDataLabels]}
                                role='img'
                                aria-label={`Saved annotation counts by class for task ${taskID}`}
                                fallbackContent={(
                                    <table>
                                        <caption>Saved annotations per class</caption>
                                        <thead><tr><th scope='col'>Class</th><th scope='col'>Count</th></tr></thead>
                                        <tbody>
                                            {counts.map((row) => (
                                                <tr key={row.label_id}><th scope='row'>{row.label_name}</th><td>{row.count}</td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            />
                        </div>
                    </div>
                )}
            </>
        );
    }

    return (
        <div className='cvat-annotation-analytics-page'>
            <Row justify='center'>
                <Col span={22} xl={20} xxl={18}>
                    {validTaskID && <Link to={`/tasks/${taskID}`}>Back to task #{taskID}</Link>}
                    <Title level={3}>Annotation Analytics</Title>
                    {validTaskID && <Text>Task #{taskID} - saved shapes per class</Text>}
                    <div className='cvat-annotation-analytics-content' aria-busy={current.status === 'loading'}>
                        {content}
                    </div>
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(AnnotationAnalyticsPage);
