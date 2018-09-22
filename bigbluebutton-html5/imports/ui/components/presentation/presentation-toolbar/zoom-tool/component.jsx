import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import Button from '/imports/ui/components/button/component';
import { styles } from '../styles.scss';

const DELAY_MILLISECONDS = 200;
const STEP_TIME = 100;

export default class ZoomTool extends Component {
  static renderAriaLabelsDescs() {
    return (
      <div hidden key="hidden-div">
        {/* Zoom in button aria */}
        <div id="zoomInLabel">
          <FormattedMessage
            id="app.presentation.presentationToolbar.zoomInLabel"
            description="Aria label for when switching to previous slide"
            defaultMessage="Previous slide"
          />
        </div>
        <div id="zoomInDesc">
          <FormattedMessage
            id="app.presentation.presentationToolbar.zoomInDesc"
            description="Aria description for when switching to previous slide"
            defaultMessage="Change the presentation to the previous slide"
          />
        </div>
        {/* Zoom out button aria */}
        <div id="zoomOutLabel">
          <FormattedMessage
            id="app.presentation.presentationToolbar.zoomOutLabel"
            description="Aria label for when switching to next slide"
            defaultMessage="Next slide"
          />
        </div>
        <div id="zoomOutDesc">
          <FormattedMessage
            id="app.presentation.presentationToolbar.zoomOutDesc"
            description="Aria description for when switching to next slide"
            defaultMessage="Change the presentation to the next slide"
          />
        </div>
        {/* Zoom indicator aria */}
        <div id="zoomIndicator">
          <FormattedMessage
            id="app.presentation.presentationToolbar.zoomIndicator"
            description="Aria label for when switching to a specific slide"
            defaultMessage="Skip slide"
          />
        </div>
      </div>
    );
  }
  constructor(props) {
    super(props);
    this.increment = this.increment.bind(this);
    this.decrement = this.decrement.bind(this);
    this.mouseDownHandler = this.mouseDownHandler.bind(this);
    this.mouseUpHandler = this.mouseUpHandler.bind(this);
    this.execInterval = this.execInterval.bind(this);
    this.onChanger = this.onChanger.bind(this);
    this.setInt = 0;
    this.state = {
      value: props.value,
      mouseHolding: false,
    };
  }
  componentDidUpdate() {
    const isDifferent = this.props.value !== this.state.value;
    if (isDifferent) this.onChanger(this.props.value);
  }

  onChanger(value) {
    const {
      maxBound,
      minBound,
      change,
    } = this.props;
    let newValue = value;
    const isDifferent = newValue !== this.state.value;

    if (newValue <= minBound) {
      newValue = minBound;
    } else if (newValue >= maxBound) {
      newValue = maxBound;
    }

    const propsIsDifferente = this.props.value !== newValue;
    if (isDifferent && propsIsDifferente) {
      this.setState({ value: newValue }, () => {
        change(newValue);
      });
    }
    if (isDifferent && !propsIsDifferente) this.setState({ value: newValue });
  }

  increment() {
    const {
      step,
    } = this.props;
    const increaseZoom = this.state.value + step;
    this.onChanger(increaseZoom);
  }
  decrement() {
    const {
      step,
    } = this.props;
    const decreaseZoom = this.state.value - step;
    this.onChanger(decreaseZoom);
  }

  execInterval(inc) {
    const exec = inc ? this.increment : this.decrement;

    const interval = () => {
      clearInterval(this.setInt);
      this.setInt = setInterval(exec, STEP_TIME);
    };

    setTimeout(() => {
      if (this.state.mouseHolding) {
        interval();
      }
    }, DELAY_MILLISECONDS);
  }

  mouseDownHandler(bool) {
    this.setState({
      ...this.state,
      mouseHolding: true,
    }, () => {
      this.execInterval(bool);
    });
  }

  mouseUpHandler() {
    this.setState({
      ...this.state,
      mouseHolding: false,
    }, () => clearInterval(this.setInt));
  }

  render() {
    const {
      value,
      minBound,
      maxBound,
    } = this.props;
    return (
      [
        ZoomTool.renderAriaLabelsDescs(),
        (<Button
          key="zoom-tool-1"
          aria-labelledby="zoomInLabel"
          aria-describedby="zoomInDesc"
          role="button"
          label="-"
          icon="minus"
          onClick={() => this.decrement()}
          disabled={(value <= minBound)}
          onMouseDown={() => this.mouseDownHandler(false)}
          onMouseUp={this.mouseUpHandler}
          onMouseLeave={this.mouseUpHandler}
          className={styles.prevSlide}
          hideLabel
        />),
        (
          <span
            key="zoom-tool-2"
            aria-labelledby="prevSlideLabel"
            aria-describedby={this.state.value}
            className={styles.zoomPercentageDisplay}
          >
            {`${this.state.value}%`}
          </span>
        ),
        (<Button
          key="zoom-tool-3"
          aria-labelledby="zoomOutLabel"
          aria-describedby="zoomOutDesc"
          role="button"
          label="+"
          icon="plus"
          onClick={() => this.increment()}
          disabled={(value >= maxBound)}
          onMouseDown={() => this.mouseDownHandler(true)}
          onMouseUp={this.mouseUpHandler}
          onMouseLeave={this.mouseUpHandler}
          className={styles.skipSlide}
          hideLabel
        />),
      ]
    );
  }
}

const propTypes = {
  value: PropTypes.number.isRequired,
  change: PropTypes.func.isRequired,
  minBound: PropTypes.number.isRequired,
  maxBound: PropTypes.number.isRequired,
  step: PropTypes.number.isRequired,
};

ZoomTool.propTypes = propTypes;
