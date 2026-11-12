import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './weeklyViewsChart.css';

const COLORS = [
  '#0084b6',
  '#f36224',
  '#95c93d',
  '#ffc909',
  '#0f2d52',
  '#8a9ba5',
];

function WeeklyViewsChart({ data }) {
  const svgRef = useRef();
  const tooltipRef = useRef();
  const [metric, setMetric] = useState('pageViews');
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const width = svgRef.current.parentElement.clientWidth;
        setDimensions({ width, height: 400 });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const metricLabel =
      metric === 'pageViews' ? 'Page Views' : 'Participations';

    // One line per Filter value
    const series = Array.from(
      d3.group(data, (d) => d.filter),
      ([name, values]) => ({
        name,
        values: values.slice().sort((a, b) => a.weekStart - b.weekStart),
      }),
    );
    const showLegend = series.length > 1;

    const margin = {
      top: 20,
      right: showLegend ? 140 : 30,
      bottom: 60,
      left: 70,
    };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('width', dimensions.width)
      .attr('height', dimensions.height);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => d.weekStart))
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d[metric]) || 1])
      .nice()
      .range([height, 0]);

    const colorScale = d3
      .scaleOrdinal()
      .domain(series.map((s) => s.name))
      .range(COLORS);

    // Gridlines
    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(yScale).ticks(6).tickSize(-width).tickFormat(''));

    // Lines
    const line = d3
      .line()
      .x((d) => xScale(d.weekStart))
      .y((d) => yScale(d[metric]))
      .curve(d3.curveMonotoneX);

    g.selectAll('.line')
      .data(series)
      .join('path')
      .attr('class', 'line')
      .attr('fill', 'none')
      .attr('stroke', (s) => colorScale(s.name))
      .attr('stroke-width', 2.5)
      .attr('d', (s) => line(s.values));

    // Points with tooltips
    const points = series.flatMap((s) =>
      s.values.map((d) => ({ ...d, seriesName: s.name })),
    );

    g.selectAll('.point')
      .data(points)
      .join('circle')
      .attr('class', 'point')
      .attr('cx', (d) => xScale(d.weekStart))
      .attr('cy', (d) => yScale(d[metric]))
      .attr('r', 4)
      .attr('fill', (d) => colorScale(d.seriesName))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .on('mouseover', function (event, d) {
        d3.select(this).attr('r', 7);
        d3.select(tooltipRef.current)
          .html(
            `
            <strong>Week of ${d3.timeFormat('%b %d, %Y')(d.weekStart)}</strong><br/>
            ${showLegend ? `${d.seriesName}<br/>` : ''}
            ${metricLabel}: ${d[metric].toLocaleString()}<br/>
            Students: ${d.students.toLocaleString()}<br/>
            Avg Page Views: ${d.avgPageViews.toFixed(1)}<br/>
            Avg Participations: ${d.avgParticipations.toFixed(1)}
          `,
          )
          .style('display', 'block')
          .style('left', `${event.clientX + 10}px`)
          .style('top', `${event.clientY - 28}px`);
      })
      .on('mouseout', function () {
        d3.select(this).attr('r', 4);
        d3.select(tooltipRef.current).style('display', 'none');
      });

    // Axes
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(Math.max(2, Math.floor(width / 90)))
      .tickFormat(d3.timeFormat('%b %d'));
    const yAxis = d3.axisLeft(yScale).ticks(6);

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis);

    g.append('g').attr('class', 'y-axis').call(yAxis);

    // Axis labels
    g.append('text')
      .attr('class', 'axis-label')
      .attr('x', width / 2)
      .attr('y', height + 45)
      .attr('text-anchor', 'middle')
      .text('Week Starting');

    g.append('text')
      .attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -55)
      .attr('text-anchor', 'middle')
      .text(`${metricLabel} per Week`);

    // Legend
    if (showLegend) {
      const legend = svg
        .append('g')
        .attr('class', 'legend-line')
        .attr(
          'transform',
          `translate(${width + margin.left + 15},${margin.top})`,
        );

      series.forEach((s, i) => {
        const row = legend
          .append('g')
          .attr('transform', `translate(0,${i * 20})`);
        row
          .append('line')
          .attr('x1', 0)
          .attr('x2', 16)
          .attr('y1', 0)
          .attr('y2', 0)
          .attr('stroke', colorScale(s.name))
          .attr('stroke-width', 3);
        row
          .append('text')
          .attr('x', 22)
          .attr('y', 4)
          .attr('class', 'legend-text')
          .text(s.name.length > 16 ? `${s.name.slice(0, 15)}…` : s.name);
      });
    }
  }, [data, dimensions, metric]);

  return (
    <div className="chart-wrapper">
      <h3 className="chart-title">Weekly Engagement</h3>
      <p className="chart-subtitle">
        Trend in page views or participations by week
      </p>

      <div className="tab-group" role="tablist">
        <button
          role="tab"
          aria-selected={metric === 'pageViews'}
          className={`tab-button ${metric === 'pageViews' ? 'active' : ''}`}
          onClick={() => setMetric('pageViews')}
        >
          Page Views
        </button>
        <button
          role="tab"
          aria-selected={metric === 'participations'}
          className={`tab-button ${metric === 'participations' ? 'active' : ''}`}
          onClick={() => setMetric('participations')}
        >
          Participations
        </button>
      </div>

      <svg ref={svgRef}></svg>
      <div ref={tooltipRef} className="tooltip"></div>
    </div>
  );
}

export default WeeklyViewsChart;
