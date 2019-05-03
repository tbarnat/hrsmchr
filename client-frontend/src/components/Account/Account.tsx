import * as React from 'react';
import Container from "react-bootstrap/Container";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import Card from 'react-bootstrap/Card';
import classes from './Account.module.scss';


class Account extends React.Component<any, any> {

  public handleSignOut() {

  }

  public changePassword() {

  }

  public removeAccount(){
    //conf modal
  }

  public renameHRC(){

  }

  public removeHRC(){
    //disabled for now
    //conf modal
  }

  render() {
    return (
      <Container className={classes.Account}>
        <br/>
        <Col/>
        <Col>
          <Card className={classes.AccountCard}>
            <Row className={classes.AccountTitleRow}>
              <Col>Nazwa użytkownika</Col>
              <Col><h3 className={classes.Title}>asd</h3></Col>
              <Col/>
            </Row>
            <Row>
              <Col className={classes.ButtonSection}>
                <Button variant="secondary" onClick={() => this.changePassword()}>
                  Zmień hasło</Button>
                <Button variant="warning" onClick={() => this.handleSignOut()}>
                  Wyloguj</Button>
                <Button variant="danger" onClick={() => this.removeAccount()}>
                  Usuń konto</Button>
              </Col>
            </Row>
            <Row className={classes.AccountTitleRow}>
              <Col>Nazwa ośrodka</Col>
              <Col><h3 className={classes.Title}>Przełaj</h3></Col>
              <Col/>
            </Row>
            <Row>
              <Col className={classes.ButtonSection}>
                <Button variant="secondary" onClick={() => this.renameHRC()}>
                  Zmień nazwę</Button>
                <Button variant="danger" disabled={true} onClick={() => this.removeHRC()}>
                  Usuń </Button>
              </Col>
            </Row>
          </Card>
        </Col>
        <Col/>
      </Container>
    );
  }
}

export default Account;