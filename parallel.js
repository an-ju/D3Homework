var bbox = d3.select("#chart");

var margin = {top: 30, right: 10, bottom: 10, left: 10},
    width = bbox.node().getBoundingClientRect().width - margin.left - margin.right,
    height = 800 - margin.top - margin.bottom;

var x = d3.scale.ordinal().rangePoints([0, width], 1),
    y = {},
    dragging = {};

var line = d3.svg.line(),
    axis = d3.svg.axis().orient("left"),
    background,
    foreground;

var tip = d3.tip()
  .attr('class', 'd3-tip')
  .offset([10, 0])
  .html(function(d) {
    return "<strong>University Name:</strong> <span style='color:red'>" + d["university_name"] + "</span>";
  });

var svg = bbox.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

svg.call(tip);

var dimensions;

d3.csv("dataset.csv", function(error, univs) {
  // Extract the list of dimensions and create a scale for each.
  dimensions = d3.keys(univs[0]).filter(function(d) {
      return d !== "university_name" && d !== "country" &&
          (y[d] = d3.scale.linear()
              .domain(d3.extent(univs, function(p) { return +p[d]; }))
              .range(get_range(d)));
  });
  x.domain(dimensions);
  d3.select('#univ-list')
      .selectAll("option")
      .data(univs)
    .enter()
      .append("option")
      .attr("d", path)
      .text(generate_tag);

  var regions = univs.map(function (d) { return d['country'] });
  var unique_regions = [];
  $.each(regions, function(i, el){
      if($.inArray(el, unique_regions) === -1) unique_regions.push(el);
  });

  d3.select('#region-list')
      .selectAll("option")
      .data(unique_regions)
    .enter()
      .append("option")
      .text(function(d) { return d });

  d3.select("#univ-list").on("change", univ_selection);
  d3.select("#region-list").on("change", region_selection);
  // Add grey background lines for context.
  background = svg.append("g")
      .attr("class", "background")
      .selectAll("path")
      .data(univs)
    .enter().append("path")
      .attr("d", path)

  // Add blue foreground lines for focus.
  foreground = svg.append("g")
      .attr("class", "foreground")
      .selectAll("path")
      .data(univs)
    .enter().append("path")
      .attr("d", path)
      .on("mouseover", tip.show)
      .on("mouseout", tip.hide);

  // Add a group element for each dimension.
  var g = svg.selectAll(".dimension")
      .data(dimensions)
      .enter().append("g")
      .attr("class", "dimension")
      .attr("transform", function(d) { return "translate(" + x(d) + ")"; })
      .call(d3.behavior.drag()
        .origin(function(d) { return {x: x(d)}; })
        .on("dragstart", function(d) {
            dragging[d] = x(d);
            background.attr("visibility", "hidden");
        })
        .on("drag", function(d) {
          dragging[d] = Math.min(width, Math.max(0, d3.event.x));
          foreground.attr("d", path);
          dimensions.sort(function(a, b) { return position(a) - position(b); });
          x.domain(dimensions);
          g.attr("transform", function(d) { return "translate(" + position(d) + ")"; })
        })
        .on("dragend", function(d) {
          delete dragging[d];
          transition(d3.select(this)).attr("transform", "translate(" + x(d) + ")");
          transition(foreground).attr("d", path);
          background
              .attr("d", path)
              .transition()
              .delay(500)
              .duration(0)
              .attr("visibility", null);
        }));

  // Add an axis and title.
  g.append("g")
      .attr("class", "axis")
      .each(function(d) { d3.select(this).call(axis.scale(y[d])); })
    .append("text")
      .style("text-anchor", "middle")
      .style("font-size", "15px")
      .attr("y", -9)
      .text(reform_tag);

  // Add and store a brush for each axis.
  g.append("g")
      .attr("class", "brush")
      .each(function(d) {
        d3.select(this).call(y[d].brush = d3.svg.brush().y(y[d]).on("brushstart", brushstart).on("brush", brush));
      })
    .selectAll("rect")
      .attr("x", -8)
      .attr("width", 16);
});

function position(d) {
  var v = dragging[d];
  return v == null ? x(d) : v;
}

function transition(g) {
  return g.transition().duration(500);
}

// Returns the path for a given data point.
function path(d) {
  return line(dimensions.map(function(p) { return [position(p), y[p](d[p])]; }));
}

function brushstart() {
  d3.event.sourceEvent.stopPropagation();
}

function get_range(d) {
    return d === 'world_rank' ? [0, height] : [height, 0];
}

function generate_tag(d) {
    return d['world_rank'] + ": " + d['university_name'];
}


function reform_tag(d) {
    var tmp_str = d.replace('_', ' ').replace('_', ' ');
    return tmp_str.charAt(0).toUpperCase() + tmp_str.substring(1);
}

// Handles a brush event, toggling the display of foreground lines.
function brush() {
  var actives = dimensions.filter(function(p) { return !y[p].brush.empty(); }),
      extents = actives.map(function(p) { return y[p].brush.extent(); });
  foreground.style("display", function(d) {
    return actives.every(function(p, i) {
      return extents[i][0] <= d[p] && d[p] <= extents[i][1];
    }) ? null : "none";
  });
}

function univ_selection() {
    var selection = this.options[this.selectedIndex].value;
    foreground.style("display", function (d) {
        return generate_tag(d) === selection ? null : "none";
    });
    return null;
}

function region_selection() {
    var selection = this.options[this.selectedIndex].value;
    foreground.style("display", function (d) {
        return d['country'] === selection ? null : "none";
    });
    return null;
}