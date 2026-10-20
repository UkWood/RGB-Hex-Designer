const test=require('node:test');
const assert=require('node:assert/strict');
const Electrical=require('../src/core/electrical-calculator');

function input(voltage=12){return {moduleCount:3,uniqueEdgeCount:10,repeatCount:2,sideMm:100,ledPerM:60,wattsPerM:18,voltage,reservePercent:20,startVertex:{gx:0,gy:0},endVertex:{gx:4,gy:0}};}

test('calculates_exact_lengths_leds_power_current_and_reserve',()=>{
  const s=Electrical.calculate(input(12));
  assert.equal(s.uniqueLengthM,1);
  assert.equal(s.repeatLengthM,0.2);
  assert.equal(s.totalLengthM,1.2);
  assert.equal(s.ledCountApprox,72);
  assert.ok(Math.abs(s.powerW-21.6)<1e-12);
  assert.ok(Math.abs(s.currentA-1.8)<1e-12);
  assert.ok(Math.abs(s.recommendedPsuW-25.92)<1e-12);
  assert.ok(Math.abs(s.repeatPercent-(0.2/1.2*100))<1e-12);
});

test('current_formula_is_correct_at_5_12_24_volts',()=>{
  for(const v of [5,12,24]){
    const s=Electrical.calculate(input(v));
    assert.ok(Math.abs(s.currentA-s.powerW/v)<1e-12);
  }
});

test('reserve_defaults_to_twenty_percent',()=>{
  const x=input(); delete x.reservePercent;
  const s=Electrical.calculate(x);
  assert.ok(Math.abs(s.recommendedPsuW-s.powerW*1.2)<1e-12);
});

test('endpoint_separation_uses_normalized_world_geometry',()=>{
  const s=Electrical.calculate(input());
  assert.ok(Math.abs(s.endpointSeparationM-(4*Math.sqrt(3)/2*0.1))<1e-12);
});

test('invalid_inputs_are_reported_without_nan_or_infinity',()=>{
  const bad={...input(),sideMm:'x',ledPerM:0,wattsPerM:Infinity,voltage:9,reservePercent:-1};
  const v=Electrical.validateInputs(bad);
  assert.equal(v.ok,false);
  assert.ok(v.errors.length>=5);
  assert.equal(v.normalized,undefined);
});
