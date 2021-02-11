import React from 'react';
import { View } from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { GlobalContext } from '@components/ContextProvider';
import { BaseScreen } from '../BaseScreen/BaseScreen';
import { JobCard } from './components/Card/JobCard';
import { JobRecord } from '@utils/airtable/interface';
import { getJobs, updateJob } from '@utils/airtable/requests';
import { Status } from '../StatusScreen/StatusScreen';
import ContactsModal from '@components/ContactsModal/ContactsModal';
import { StatusController } from '@screens/StatusScreen/StatusController';

// BWBP
import { Overlay, CheckBox, Button } from 'react-native-elements';
import { cloneDeep } from 'lodash';

interface Availability {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
}

interface JobsScreenState {
  title: string;
  jobs: JobRecord[];
  refreshing: boolean;
  staticHeader: boolean;
  status: Status;
  availability: Availability;
}

interface JobsScreenProps {
  navigation: BottomTabNavigationProp;
}

/**
 *
 * Sources:
 * - Compontent Library: https://react-native-elements.github.io/react-native-elements/docs/button.html
 *
 */
export class JobsScreen extends React.Component<JobsScreenProps, JobsScreenState> {
  static contextType = GlobalContext;

  constructor(props: JobsScreenProps) {
    super(props);

    this.state = {
      title: 'Jobs',
      jobs: [],
      refreshing: true,
      staticHeader: false,
      status: Status.none,
      availability: {
        monday: false,
        tuesday: false,
        wednesday: true,
        thursday: true,
        friday: false,
      },
    };
  }

  componentDidMount(): void {
    this.props.navigation.addListener('focus', this.fetchRecords);
  }

  createJobCard = (record: JobRecord, index: number): React.ReactElement => {
    return (
      <JobCard
        key={index}
        user={this.context.user}
        submitted={this.context.user.rid in record.users}
        jobRecord={record}
        updatefn={(): void => {
          updateJob(record.rid, this.context.user);
        }}
      />
    );
  };

  fetchRecords = async (): Promise<void> => {
    this.setState({
      refreshing: true,
    });
    const jobs: JobRecord[] = await getJobs();
    this.setState({
      refreshing: false,
      jobs,
      status: this.getStatus(jobs),
    });
  };

  filterJobs = (jobs: JobRecord[], availability: Availability): void => {
    const newJobs: JobRecord[] = cloneDeep(jobs);
    console.log(newJobs, availability);
    for (let i = newJobs.length - 1; i >= 0; i--) {
      let available = false;
      Object.entries(availability).forEach(([key, val]) => {
        if (val && newJobs[i].schedule.includes(key.charAt(0).toUpperCase() + key.slice(1))) {
          available = true;
          return;
        }
      });
      if (!available) {
        newJobs.splice(i, 1);
      }
    }
    this.setState({ jobs: newJobs });
  };

  getStatus = (jobs: JobRecord[]): Status => {
    if (!this.context.user.graduated) {
      return Status.jobLocked;
    } else if (jobs.length == 0) {
      return Status.noContent;
    } else {
      return Status.none;
    }
  };

  setHeader = (): void => {
    this.setState({ staticHeader: true });
  };

  renderCards(): React.ReactElement {
    return <>{this.state.jobs.map((record, index) => this.createJobCard(record, index))}</>;
  }

  render() {
    const { monday, tuesday, wednesday, thursday, friday } = this.state.availability;
    return (
      <BaseScreen
        title={this.state.title}
        refreshMethod={this.fetchRecords}
        refreshing={this.state.refreshing}
        static={this.state.status != Status.none ? 'expanded' : ''}
        headerRightButton={
          <ContactsModal
            resetTesting={(): void => {
              this.props.navigation.navigate('Login');
            }}
          />
        }
      >
        <View>
          <CheckBox
            title="Monday"
            checked={monday}
            onPress={() =>
              this.setState(prev => {
                return { ...prev, availability: { ...prev.availability, monday: !monday } };
              })
            }
          />
          <CheckBox
            title="Tuesday"
            checked={tuesday}
            onPress={() =>
              this.setState(prev => {
                return { ...prev, availability: { ...prev.availability, tuesday: !tuesday } };
              })
            }
          />
          <CheckBox
            title="Wednesday"
            checked={wednesday}
            onPress={(): void =>
              this.setState(prev => {
                return { ...prev, availability: { ...prev.availability, wednesday: !wednesday } };
              })
            }
          />
          <CheckBox
            title="Thursday"
            checked={thursday}
            onPress={(): void =>
              this.setState(prev => {
                return { ...prev, availability: { ...prev.availability, thursday: !thursday } };
              })
            }
          />
          <CheckBox
            title="Friday"
            checked={friday}
            onPress={(): void =>
              this.setState(prev => {
                return { ...prev, availability: { ...prev.availability, friday: !friday } };
              })
            }
          />
        </View>
        <View style={{ alignItems: 'center', marginVertical: 20 }}>
          <Button
            title="Filter Search"
            containerStyle={{ width: '50%' }}
            onPress={(): void => {
              this.filterJobs(this.state.jobs, this.state.availability);
            }}
          />
        </View>
        <StatusController defaultChild={this.renderCards()} status={this.state.status} />
      </BaseScreen>
    );
  }
}
