import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './navPagesChart.css';

const METRICS = {
  pageViews: { label: 'Page Views', color: '#0084b6' },
  students: { label: 'Students', color: '#95c93d' },
};

function NavPagesChart({ data }) {
  const svgRef = useRef();
  const tooltipRef = useRef();
  const [metric, setMetric] = useState('pageViews');
  const [dimensions, setDimensions] = useState({ width: 600, height: 420 });

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const width = svgRef.current.parentElement.clientWidth;
        setDimensions({ width, height: 420 });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const margin = { top: 30, right: 20, bottom: 110, left: 70 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll('*').remove();

    // Main navigation pages = resource types where Name is blank
    const navRows = data.filter((d) => d.name === '');

    const aggregated = d3.rollup(
      navRows,
      (v) => ({
        pageViews: d3.sum(v, (d) => d.pageViews),
        students: d3.sum(v, (d) => d.students),
        participations: d3.sum(v, (d) => d.participations),
      }),
      (d) => d.resourceType,
    );

    const chartData = Array.from(aggregated, ([resourceType, values]) => ({
      resourceType,
      ...values,
    })).sort((a, b) => b[metric] - a[metric]);

    if (chartData.length === 0) return;

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
      .domain(chartData.map((d) => d.resourceType))
      .range([0, width])
      .padding(0.25);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(chartData, (d) => d[metric]) || 1])
      .nice()
      .range([height, 0]);

    const barColor = METRICS[metric].color;

    // Draw bars (min height of 2px so very small values stay visible)
    const barHeight = (d) =>
      d[metric] > 0 ? Math.max(2, height - yScale(d[metric])) : 0;

    g.selectAll('.bar')
      .data(chartData)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', (d) => xScale(d.resourceType))
      .attr('y', (d) => height - barHeight(d))
      .attr('width', xScale.bandwidth())
      .attr('height', barHeight)
      .attr('fill', barColor)
      .style('pointer-events', 'none');

    // Invisible full-height hover areas, one per bar, so tiny bars are still hoverable
    const step = xScale.step();
    const hitOffset = (step - xScale.bandwidth()) / 2;

    g.selectAll('.bar-hit')
      .data(chartData)
      .join('rect')
      .attr('class', 'bar-hit')
      .attr('x', (d) => xScale(d.resourceType) - hitOffset)
      .attr('y', 0)
      .attr('width', step)
      .attr('height', height)
      .attr('fill', 'transparent')
      .on('mouseover', function (event, d) {
        g.selectAll('.bar')
          .filter((b) => b === d)
          .attr('opacity', 0.7);
        d3.select(tooltipRef.current)
          .html(
            `
            <strong>${d.resourceType}</strong><br/>
            Page Views: ${d.pageViews.toLocaleString()}<br/>
            Students: ${d.students.toLocaleString()}<br/>
            Participations: ${d.participations.toLocaleString()}
          `,
          )
          .style('display', 'block')
          .style('left', `${event.clientX + 10}px`)
          .style('top', `${event.clientY - 28}px`);
      })
      .on('mousemove', function (event) {
        d3.select(tooltipRef.current)
          .style('left', `${event.clientX + 10}px`)
          .style('top', `${event.clientY - 28}px`);
      })
      .on('mouseout', function (event, d) {
        g.selectAll('.bar')
          .filter((b) => b === d)
          .attr('opacity', 1);
        d3.select(tooltipRef.current).style('display', 'none');
      });

    // Value labels
    g.selectAll('.value-label')
      .data(chartData)
      .join('text')
      .attr('class', 'value-label')
      .attr('x', (d) => xScale(d.resourceType) + xScale.bandwidth() / 2)
      .attr('y', (d) => yScale(d[metric]) - 6)
      .attr('text-anchor', 'middle')
      .attr('font-size', '0.75rem')
      .attr('fill', '#333333')
      .style('pointer-events', 'none')
      .text((d) => d[metric].toLocaleString());

    // Axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale).ticks(6);

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .selectAll('text')
      .attr('transform', 'rotate(-35)')
      .style('text-anchor', 'end');

    g.append('g').attr('class', 'y-axis').call(yAxis);

    // Axis labels
    g.append('text')
      .attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -55)
      .attr('text-anchor', 'middle')
      .text(METRICS[metric].label);
  }, [data, dimensions, metric]);

  return (
    <div className="chart-wrapper">
      <h3 className="chart-title">Navigation Pages</h3>
      <p className="chart-subtitle">Interactions for each navigation page</p>

      <div className="tab-group" role="tablist">
        {Object.entries(METRICS).map(([key, { label }]) => (
          <button
            key={key}
            role="tab"
            aria-selected={metric === key}
            className={`tab-button ${metric === key ? 'active' : ''}`}
            onClick={() => setMetric(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <svg ref={svgRef}></svg>
      <div ref={tooltipRef} className="tooltip"></div>
    </div>
  );
}

export default NavPagesChart;
