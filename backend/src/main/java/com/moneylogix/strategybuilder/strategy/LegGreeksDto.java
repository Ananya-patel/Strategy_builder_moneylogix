package com.moneylogix.strategybuilder.strategy;

import com.fasterxml.jackson.annotation.JsonProperty;

public class LegGreeksDto {
    private double strike;
    @JsonProperty("option_type")
    private String optionType;
    private String position;
    private double delta;
    private double theta;

    public double getStrike() { return strike; }
    public void setStrike(double strike) { this.strike = strike; }
    public String getOptionType() { return optionType; }
    public void setOptionType(String optionType) { this.optionType = optionType; }
    public String getPosition() { return position; }
    public void setPosition(String position) { this.position = position; }
    public double getDelta() { return delta; }
    public void setDelta(double delta) { this.delta = delta; }
    public double getTheta() { return theta; }
    public void setTheta(double theta) { this.theta = theta; }
}
