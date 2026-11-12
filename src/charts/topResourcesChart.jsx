import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import './topResourcesChart.css';

const PAGE_SIZE = 15;
const ALL_TYPES = 'All Resource Types';

const METRICS = {
  students: { label: 'Students', color: '#95c93d' },
  pageViews: { label: 'Page Views', color: '#0084b6' },
  participations: { label: 'Participations', color: '#f36224' },
};

const truncate = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function TopResourcesChart({ data }) {
  const svgRef = useRef();
  const tooltipRef = useRef();
  const [resourceType, setResourceType] = useState(ALL_TYPES);
  const [metric, setMetric] = useState('pageViews');
  const [page, setPage] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 600, height: 560 });

  // Named resources only (blank names are the main navigation pages)
  const namedRows = useMemo(
    () => (data || []).filter((d) => d.name !== ''),
    [data],
  );

  const resourceTypes = useMemo(
    () => [
      ALL_TYPES,
      ...Array.from(new Set(namedRows.map((d) => d.resourceType))).sort(),
    ],
    [namedRows],
  );

  const sortedRows = useMemo(() => {
    const rows =
      resourceType === ALL_TYPES
        ? namedRows
        : namedRows.filter((d) => d.resourceType === resourceType);
    return rows.slice().sort((a, b) => b[metric] - a[metric]);
  }, [namedRows, resourceType, metric]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const pageRows = useMemo(
    () => sortedRows.slice(start, start + PAGE_SIZE),
    [sortedRows, start],
  );

  // Go back to the first page whenever the ranking changes
  useEffect(() => {
    setPage(0);
  }, [resourceType, metric]);

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const width = svgRef.current.parentElement.clientWidth;
        setDimensions({ width, height: 560 });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    d3.select(svgRef.current).selectAll('*').remove();
    if (pageRows.length === 0) return;

    const margin = { top: 20, right: 60, bottom: 60, left: 260 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    const svg = d3
      .select(svgRef.current)
      .attr('width', dimensions.width)
      .attr('height', dimensions.height);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales (indexes as the domain so duplicate names never collide)
    const yScale = d3
      .scaleBand()
      .domain(pageRows.map((_, i) => i))
      .range([0, height])
      .padding(0.2);

    const xScale = d3
      .scaleLinear()
      .domain([0, d3.max(pageRows, (d) => d[metric]) || 1])
      .nice()
      .range([0, width]);

    const barColor = METRICS[metric].color;

    // Draw bars
    g.selectAll('.bar')
      .data(pageRows)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', 0)
      .attr('y', (_, i) => yScale(i))
      .attr('width', (d) => xScale(d[metric]))
      .attr('height', yScale.bandwidth())
      .attr('fill', barColor)
      .on('mouseover', function (event, d) {
        d3.select(this).attr('opacity', 0.7);
        d3.select(tooltipRef.current)
          .html(
            `
            <strong>${d.name}</strong><br/>
            Type: ${d.resourceType}<br/>
            Students: ${d.students.toLocaleString()}<br/>
            Page Views: ${d.pageViews.toLocaleString()}<br/>
            Participations: ${d.participations.toLocaleString()}
          `,
          )
          .style('display', 'block')
          .style('left', `${event.clientX + 10}px`)
          .style('top', `${event.clientY - 28}px`);
      })
      .on('mouseout', function () {
        d3.select(this).attr('opacity', 1);
        d3.select(tooltipRef.current).style('display', 'none');
      });

    // Value labels
    g.selectAll('.value-label')
      .data(pageRows)
      .join('text')
      .attr('class', 'value-label')
      .attr('x', (d) => xScale(d[metric]) + 5)
      .attr('y', (_, i) => yScale(i) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('font-size', '0.75rem')
      .attr('fill', '#333333')
      .text((d) => d[metric].toLocaleString());

    // Axes
    const xAxis = d3.axisBottom(xScale).ticks(6);
    const yAxis = d3
      .axisLeft(yScale)
      .tickFormat((i) => `${start + i + 1}. ${truncate(pageRows[i].name, 34)}`);

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis);

    g.append('g').attr('class', 'y-axis').call(yAxis);

    // Axis label
    g.append('text')
      .attr('class', 'axis-label')
      .attr('x', width / 2)
      .attr('y', height + 45)
      .attr('text-anchor', 'middle')
      .text(METRICS[metric].label);
  }, [pageRows, dimensions, metric, start]);

  const rangeStart = sortedRows.length === 0 ? 0 : start + 1;
  const rangeEnd = Math.min(start + PAGE_SIZE, sortedRows.length);

  return (
    <div className="chart-wrapper">
      <h3 className="chart-title">Top Resources</h3>
      <p className="chart-subtitle">
        Individual resources ranked by the selected metric
      </p>

      <div className="tab-group tab-group-wrap" role="tablist">
        {resourceTypes.map((type) => (
          <button
            key={type}
            role="tab"
            aria-selected={resourceType === type}
            className={`tab-button ${resourceType === type ? 'active' : ''}`}
            onClick={() => setResourceType(type)}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="controls-inline">
        <label>Rank by:</label>
        <div className="radio-group">
          {Object.entries(METRICS).map(([key, { label }]) => (
            <button
              key={key}
              className={`metric-button ${metric === key ? 'active' : ''}`}
              onClick={() => setMetric(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="pager">
          <button
            className="pager-button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            aria-label="Previous 15 resources"
          >
            ‹ Previous
          </button>
          <span className="pager-status">
            {rangeStart}–{rangeEnd} of {sortedRows.length.toLocaleString()}
          </span>
          <button
            className="pager-button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            aria-label="Next 15 resources"
          >
            Next ›
          </button>
        </div>
      </div>

      {sortedRows.length === 0 && (
        <p className="empty-message">No named resources for this type.</p>
      )}
      <svg ref={svgRef}></svg>
      <div ref={tooltipRef} className="tooltip"></div>
    </div>
  );
}

export default TopResourcesChart;
