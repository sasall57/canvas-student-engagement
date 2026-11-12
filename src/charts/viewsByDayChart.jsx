import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './viewsByDayChart.css';

const MAX_STACKS = 6;
const COLORS = [
  '#0084b6',
  '#f36224',
  '#95c93d',
  '#ffc909',
  '#0f2d52',
  '#8a9ba5',
];
const OTHER_COLOR = '#d3d8dc';

const truncate = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function ViewsByDayChart({ data }) {
  const svgRef = useRef();
  const tooltipRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 600, height: 450 });

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const width = svgRef.current.parentElement.clientWidth;
        setDimensions({ width, height: 450 });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const margin = { top: 20, right: 200, bottom: 60, left: 60 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll('*').remove();

    // Top content items by total views; everything else is grouped as "Other"
    const totals = d3.rollup(
      data,
      (v) => d3.sum(v, (d) => d.timesViewed),
      (d) => d.contentName,
    );
    const topNames = Array.from(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_STACKS)
      .map(([name]) => name);
    const hasOther = totals.size > MAX_STACKS;
    const keys = hasOther ? [...topNames, 'Other'] : topNames;

    // One row per day with a column per stack key
    const byDay = d3.rollup(
      data,
      (v) => {
        const row = {};
        keys.forEach((k) => (row[k] = 0));
        v.forEach((d) => {
          const key = topNames.includes(d.contentName)
            ? d.contentName
            : 'Other';
          row[key] += d.timesViewed;
        });
        return row;
      },
      (d) => +d3.timeDay(d.date),
    );

    const chartData = Array.from(byDay, ([time, row]) => ({
      date: new Date(time),
      ...row,
    })).sort((a, b) => a.date - b.date);

    const stacked = d3.stack().keys(keys)(chartData);

    const colorScale = d3
      .scaleOrdinal()
      .domain(keys)
      .range(
        keys.map((k, i) =>
          k === 'Other' ? OTHER_COLOR : COLORS[i % COLORS.length],
        ),
      );

    const svg = d3
      .select(svgRef.current)
      .attr('width', dimensions.width)
      .attr('height', dimensions.height);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3
      .scaleBand()
      .domain(chartData.map((d) => +d.date))
      .range([0, width])
      .padding(0.15);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(stacked, (layer) => d3.max(layer, (d) => d[1])) || 1])
      .nice()
      .range([height, 0]);

    // Stacks
    g.selectAll('.stack')
      .data(stacked)
      .join('g')
      .attr('class', 'stack')
      .attr('fill', (d) => colorScale(d.key))
      .selectAll('rect')
      .data((layer) => layer.map((d) => ({ ...d, key: layer.key })))
      .join('rect')
      .attr('class', 'bar')
      .attr('x', (d) => xScale(+d.data.date))
      .attr('y', (d) => yScale(d[1]))
      .attr('height', (d) => yScale(d[0]) - yScale(d[1]))
      .attr('width', xScale.bandwidth())
      .on('mouseover', function (event, d) {
        d3.select(this).attr('opacity', 0.7);
        const dayTotal = d3.sum(keys, (k) => d.data[k]);
        d3.select(tooltipRef.current)
          .html(
            `
            <strong>${d3.timeFormat('%A, %b %d, %Y')(d.data.date)}</strong><br/>
            ${d.key}: ${d.data[d.key].toLocaleString()} views<br/>
            Day total: ${dayTotal.toLocaleString()} views
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

    // Axes (thin out x ticks so labels do not overlap)
    const step = Math.max(
      1,
      Math.ceil(chartData.length / Math.max(2, Math.floor(width / 70))),
    );
    const xAxis = d3
      .axisBottom(xScale)
      .tickValues(
        chartData.filter((_, i) => i % step === 0).map((d) => +d.date),
      )
      .tickFormat((t) => d3.timeFormat('%b %d')(new Date(t)));
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
      .text('Day');

    g.append('text')
      .attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -45)
      .attr('text-anchor', 'middle')
      .text('Times Viewed');

    // Legend
    const legend = svg
      .append('g')
      .attr('class', 'legend-stacked')
      .attr(
        'transform',
        `translate(${width + margin.left + 20},${margin.top})`,
      );

    [...keys].reverse().forEach((key, i) => {
      const row = legend
        .append('g')
        .attr('transform', `translate(0,${i * 22})`);
      row
        .append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', colorScale(key));
      row
        .append('text')
        .attr('x', 18)
        .attr('y', 10)
        .attr('class', 'legend-text')
        .text(truncate(key, 24))
        .append('title')
        .text(key);
    });
  }, [data, dimensions]);

  return (
    <div className="chart-wrapper">
      <h3 className="chart-title">Views per Day by Content</h3>
      <p className="chart-subtitle">Daily views stacked by content item</p>

      <svg ref={svgRef}></svg>
      <div ref={tooltipRef} className="tooltip"></div>
    </div>
  );
}

export default ViewsByDayChart;
