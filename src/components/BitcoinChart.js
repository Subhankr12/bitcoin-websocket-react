import React, { Component } from "react";
import { withStyles } from "@material-ui/core/styles";
import Chart from "./Chart";
import axios from "axios";

//chart container style
const styles = (theme) => ({
  "chart-container": {
    height: 600,
  },
});

class BitcoinChart extends Component {
  state = {
    //array for saving response from axios get request
    pastBTCData: [],

    //chart js components
    lineChartData: {
      labels: [],
      datasets: [
        {
          type: "line",
          label: "BTC-USD",
          backgroundColor: "rgba(0, 0, 0, 0)",
          borderColor: this.props.theme.palette.primary.main,
          pointBackgroundColor: this.props.theme.palette.secondary.main,
          pointBorderColor: this.props.theme.palette.secondary.main,
          borderWidth: "3",
          lineTension: 0.45,
          data: [],
        },
      ],
    },
    lineChartOptions: {
      responsive: true,
      maintainAspectRatio: false,
      tooltips: {
        enabled: true,
      },
      scales: {
        xAxes: [
          {
            ticks: {
              autoSkip: true,
              maxTicksLimit: 10,
            },
          },
        ],
      },
    },
  };

  //Component Lifecycle
  //mounting
  async componentDidMount() {
    //axios get request
    await axios
      .get(
        "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/?vs_currency=usd&days=100"
      )
      .then((res) => {
        console.log(res.data.prices);
        this.setState({
          pastBTCData: res.data.prices,
        });
      })
      .catch((err) => {
        console.log(err.message);
      });

    //setting up previous 100 days data and rendering to front end
    const { pastBTCData } = this.state;
    for (let i = 0; i < 100; i++) {
      const pastData = this.state.lineChartData.datasets[0];
      const newData = { ...pastData };
      newData.data.push(pastBTCData[i][1]);
      const chartData = {
        ...this.state.lineChartData,
        datasets: [newData],
        labels: this.state.lineChartData.labels.concat(
          new Date().toLocaleTimeString()
        ),
      };
      this.setState({
        lineChartData: chartData,
      });
    }

    //for web socket connection
    const subscribe = {
      type: "subscribe",
      channels: [
        {
          name: "ticker",
          product_ids: ["BTC-USD"],
        },
      ],
    };

    this.ws = new WebSocket("wss://ws-feed.gdax.com");

    // send message object as json-formatted string
    this.ws.onopen = () => {
      this.ws.send(JSON.stringify(subscribe));
    };

    //receiving messages from the server
    this.ws.onmessage = (e) => {
      const value = JSON.parse(e.data);
      if (value.type !== "ticker") {
        return;
      }

      //setting up received value to chart and rendering it
      const oldBtcDataSet = this.state.lineChartData.datasets[0];
      const newBtcDataSet = { ...oldBtcDataSet };
      newBtcDataSet.data.push(value.price);

      const newChartData = {
        ...this.state.lineChartData,
        datasets: [newBtcDataSet],
        labels: this.state.lineChartData.labels.concat(
          new Date().toLocaleTimeString()
        ),
      };
      this.setState({ lineChartData: newChartData });
    };
  }

  //unmounting
  componentWillUnmount() {
    this.ws.close();
  }

  render() {
    const { classes } = this.props;

    return (
      <div className={classes["chart-container"]}>
        <Chart
          data={this.state.lineChartData}
          options={this.state.lineChartOptions}
        />
      </div>
    );
  }
}

export default withStyles(styles, { withTheme: true })(BitcoinChart);
