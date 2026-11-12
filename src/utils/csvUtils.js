import * as d3 from 'd3';

const DATA_PATH = `${process.env.PUBLIC_URL || ''}/data/`;

// ---------- helpers ----------
export const cleanString = (v) => (v === undefined || v === null ? '' : String(v).trim());

export const toNumber = (v) => {
    if (v === undefined || v === null) return 0;
    const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
    return Number.isNaN(n) ? 0 : n;
};

// Handles ISO dates (as local time, avoiding off-by-one-day bugs) and m/d/yyyy
export const parseDate = (v) => {
    const s = cleanString(v);
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        const iso = d3.timeParse('%Y-%m-%d')(s.slice(0, 10));
        if (iso) return iso;
    }
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
};

// ---------- loaders ----------
export async function loadViewsByDay() {
    const raw = await d3.csv(`${DATA_PATH}views_by_day_content.csv`);
    return raw
        .map((r) => ({
            date: parseDate(r['view_day']),
            contentName: cleanString(r['Content Name']) || 'Unnamed',
            timesViewed: toNumber(r['times_viewed']),
            totalMinutes: toNumber(r['total_time_viewed_min']),
        }))
        .filter((d) => d.date);
}

export async function loadWeekly() {
    const raw = await d3.csv(`${DATA_PATH}chart.csv`);
    return raw
        .map((r) => ({
            weekStart: parseDate(r['Week Start']),
            filter: cleanString(r['Filter']) || 'All',
            students: toNumber(r['Students']),
            avgPageViews: toNumber(r['Avg Page Views']),
            avgParticipations: toNumber(r['Avg Participations']),
            pageViews: toNumber(r['Page Views']),
            participations: toNumber(r['Participations']),
        }))
        .filter((d) => d.weekStart);
}

export async function loadResources() {
    const raw = await d3.csv(`${DATA_PATH}resources.csv`);
    return raw.map((r) => ({
        source: cleanString(r['Source']),
        resourceType: cleanString(r['Resource Type']) || 'Unknown',
        name: cleanString(r['Name']),
        students: toNumber(r['Students']),
        pageViews: toNumber(r['Page Views']),
        participations: toNumber(r['Participations']),
    }));
}

export async function loadAllData() {
    const [viewsByDay, weekly, resources] = await Promise.all([
        loadViewsByDay(),
        loadWeekly(),
        loadResources(),
    ]);
    return { viewsByDay, weekly, resources };
}