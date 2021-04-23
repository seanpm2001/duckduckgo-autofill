module.exports = `
.wrapper *, .wrapper *::before, .wrapper *::after {
    box-sizing: border-box;
}
.wrapper {
    position: fixed;
    top: 0;
    left: 0;
    padding: 0;
    font-family: 'DDG_ProximaNova', 'Proxima Nova', -apple-system,
    BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu',
    'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    -webkit-font-smoothing: antialiased;
    z-index: 2147483647;
}
.tooltip {
    position: absolute;
    top: calc(100% + 6px);
    right: calc(100% - 46px);
    width: 300px;
    max-width: calc(100vw - 25px);
    padding: 8px;
    border: 1px solid #D0D0D0;
    border-radius: 10px;
    background-color: #FFFFFF;
    font-size: 14px;
    color: #333333;
    line-height: 1.3;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
    z-index: 2147483647;
}
.tooltip::before,
.tooltip::after {
    content: "";
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    display: block;
    border-bottom: 8px solid #D0D0D0;
    position: absolute;
    right: 20px;
}
.tooltip::before {
    border-bottom-color: #D0D0D0;
    top: -9px;
}
.tooltip::after {
    border-bottom-color: #FFFFFF;
    top: -8px;
}
.tooltip__button {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    width: 100%;
    padding: 4px 8px 7px;
    font-family: inherit;
    font-size: 14px;
    background: transparent;
    border: none;
    border-radius: 6px;
}
.tooltip__button:hover {
    background-color: #3969EF;
    color: #FFFFFF;
}
.tooltip__button__primary-text {
    font-weight: bold;
}
.tooltip__button__secondary-text {
    font-size: 12px;
}
`
